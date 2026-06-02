import { describe, expect, it, vi } from "vitest";
import type { CostExplorerClientLike } from "../../aws/cost-explorer.js";
import { DEFAULT_CONFIG } from "../../config/schema.js";
import { CeSource } from "./source.js";

describe("CeSource", () => {
  it("fetchDaily calls GetCostAndUsage with USAGE_TYPE group", async () => {
    const client: CostExplorerClientLike = {
      getCostAndUsage: vi.fn().mockResolvedValue([]),
    };
    const source = new CeSource(client, DEFAULT_CONFIG);
    await source.fetchDaily({ kind: "all" }, { since: "2026-06-01", until: "2026-06-08" });
    expect(client.getCostAndUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        Granularity: "DAILY",
        GroupBy: [{ Type: "DIMENSION", Key: "USAGE_TYPE" }],
      }),
    );
  });

  it("probe calls minimal Bedrock query", async () => {
    const client: CostExplorerClientLike = {
      getCostAndUsage: vi.fn().mockResolvedValue([]),
    };
    const source = new CeSource(client, DEFAULT_CONFIG);
    await source.probe();
    expect(client.getCostAndUsage).toHaveBeenCalled();
  });

  it("fetchMonthly and fetchModels aggregate usage types", async () => {
    const results = [
      {
        TimePeriod: { Start: "2026-06-01", End: "2026-07-01" },
        Groups: [
          {
            Keys: ["USE1-Claude-Input-Tokens"],
            Metrics: {
              UnblendedCost: { Amount: "2.00", Unit: "USD" },
              UsageQuantity: { Amount: "100", Unit: "N/A" },
            },
          },
        ],
      },
    ];
    const client: CostExplorerClientLike = {
      getCostAndUsage: vi.fn().mockResolvedValue(results),
    };
    const source = new CeSource(client, DEFAULT_CONFIG);
    const principal = { kind: "tag" as const, key: "user", value: "alice" };
    const range = { since: "2026-06-01", until: "2026-07-01" };
    const monthly = await source.fetchMonthly(principal, range);
    expect(monthly[0]?.cost).toBe(2);
    const models = await source.fetchModels(principal, range);
    expect(models[0]?.model).toBeTruthy();
    const freshness = await source.fetchBillingFreshness(principal);
    expect(freshness.status).toBe("partial");
  });

  it("fetchWeekly rolls up daily rows", async () => {
    const results = [
      {
        TimePeriod: { Start: "2026-06-01", End: "2026-06-02" },
        Groups: [
          {
            Keys: ["USE1-Claude-Input-Tokens"],
            Metrics: {
              UnblendedCost: { Amount: "1.00", Unit: "USD" },
              UsageQuantity: { Amount: "10", Unit: "N/A" },
            },
          },
        ],
      },
      {
        TimePeriod: { Start: "2026-06-02", End: "2026-06-03" },
        Groups: [
          {
            Keys: ["USE1-Claude-Input-Tokens"],
            Metrics: {
              UnblendedCost: { Amount: "2.00", Unit: "USD" },
              UsageQuantity: { Amount: "20", Unit: "N/A" },
            },
          },
        ],
      },
    ];
    const client: CostExplorerClientLike = {
      getCostAndUsage: vi.fn().mockResolvedValue(results),
    };
    const source = new CeSource(client, DEFAULT_CONFIG);
    const weekly = await source.fetchWeekly(
      { kind: "all" },
      { since: "2026-06-01", until: "2026-06-08" },
    );
    expect(weekly[0]?.cost).toBe(3);
    expect(weekly[0]?.top_model).toBeTruthy();
  });

  it("fetchUsers rejects CE principal grouping", async () => {
    const source = new CeSource({ getCostAndUsage: vi.fn() }, DEFAULT_CONFIG);
    await expect(source.fetchUsers({ since: "2026-06-01", until: "2026-06-08" })).rejects.toThrow(
      "--source cur",
    );
  });
});
