import { describe, expect, it, vi } from "vitest";
import { estimateCostFromRates, LivePricingCatalog } from "./pricing.js";

const send = vi.fn();

vi.mock("@aws-sdk/client-pricing", () => ({
  PricingClient: class {
    send = send;
  },
  GetProductsCommand: class {
    constructor(public readonly input: unknown) {}
  },
}));

describe("estimateCostFromRates", () => {
  it("sums token costs", () => {
    const cost = estimateCostFromRates(
      {
        inputPerToken: 0.000003,
        outputPerToken: 0.000015,
        cacheReadPerToken: 0.0000003,
        cacheWritePerToken: 0.00000375,
      },
      { input: 1000, output: 500, cache_read: 2000, cache_write: 100 },
    );
    expect(cost).toBeCloseTo(
      0.000003 * 1000 + 0.000015 * 500 + 0.0000003 * 2000 + 0.00000375 * 100,
    );
  });
});

describe("LivePricingCatalog", () => {
  it("parses on-demand token rates from Price List API", async () => {
    send.mockClear();
    const priceList = JSON.stringify({
      terms: {
        OnDemand: {
          t1: {
            priceDimensions: {
              d1: {
                description: "Claude input",
                pricePerUnit: { USD: "0.000003" },
              },
              d2: {
                description: "Claude output",
                pricePerUnit: { USD: "0.000015" },
              },
            },
          },
        },
      },
    });
    send.mockResolvedValue({ PriceList: [priceList] });

    const catalog = new LivePricingCatalog({ send } as never);
    const rates = await catalog.getModelRates("anthropic.claude-3-5-sonnet", "us-east-1");
    expect(rates?.inputPerToken).toBe(0.000003);
    expect(rates?.outputPerToken).toBe(0.000015);
  });

  it("returns null for unknown region", async () => {
    send.mockClear();
    const catalog = new LivePricingCatalog({ send } as never);
    const rates = await catalog.getModelRates("model", "unknown-region-99");
    expect(rates).toBeNull();
    expect(send).not.toHaveBeenCalled();
  });

  it("parses cache read and write dimensions", async () => {
    send.mockClear();
    const priceList = JSON.stringify({
      terms: {
        OnDemand: {
          t1: {
            priceDimensions: {
              d1: { description: "input tokens", pricePerUnit: { USD: "0.000003" } },
              d2: { description: "output tokens", pricePerUnit: { USD: "0.000015" } },
              d3: {
                description: "input cache read tokens",
                pricePerUnit: { USD: "0.0000003" },
              },
              d4: {
                description: "input cache write tokens",
                pricePerUnit: { USD: "0.00000375" },
              },
            },
          },
        },
      },
    });
    send.mockResolvedValue({ PriceList: [priceList] });
    const catalog = new LivePricingCatalog({ send } as never);
    const rates = await catalog.getModelRates("m", "us-east-1");
    expect(rates?.cacheReadPerToken).toBe(0.0000003);
    expect(rates?.cacheWritePerToken).toBe(0.00000375);
  });

  it("returns null when input or output price missing", async () => {
    send.mockClear();
    const priceList = JSON.stringify({
      terms: {
        OnDemand: {
          t1: {
            priceDimensions: {
              d1: { description: "input tokens", pricePerUnit: { USD: "0.000003" } },
            },
          },
        },
      },
    });
    send.mockResolvedValue({ PriceList: [priceList] });
    const catalog = new LivePricingCatalog({ send } as never);
    expect(await catalog.getModelRates("m", "us-east-1")).toBeNull();
  });

  it("returns null for malformed price list entry", async () => {
    send.mockClear();
    send.mockResolvedValue({ PriceList: ["not-json"] });
    const catalog = new LivePricingCatalog({ send } as never);
    expect(await catalog.getModelRates("m", "us-east-1")).toBeNull();
  });

  it("caches lookups", async () => {
    send.mockClear();
    send.mockResolvedValue({ PriceList: [] });
    const catalog = new LivePricingCatalog({ send } as never);
    await catalog.getModelRates("m", "us-east-1");
    await catalog.getModelRates("m", "us-east-1");
    expect(send).toHaveBeenCalledTimes(1);
  });
});
