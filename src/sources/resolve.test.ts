import { describe, expect, it, vi } from "vitest";
import type { AthenaExecutor } from "../aws/athena.js";
import { DEFAULT_CONFIG } from "../config/schema.js";
import { CeSource } from "./ce/source.js";
import { CurSource } from "./cur/source.js";
import { resolveBillingSource } from "./resolve.js";

describe("resolveBillingSource", () => {
  const config = DEFAULT_CONFIG;

  it("returns cur when requested", async () => {
    const cur = new CurSource({ executeQuery: vi.fn() }, config);
    const ce = new CeSource({ getCostAndUsage: vi.fn() }, config);
    const result = await resolveBillingSource(
      "cur",
      () => cur,
      () => ce,
      config,
      null,
    );
    expect(result.resolved).toBe("cur");
  });

  it("returns ce when requested", async () => {
    const cur = new CurSource({ executeQuery: vi.fn() }, config);
    const ce = new CeSource({ getCostAndUsage: vi.fn() }, config);
    const result = await resolveBillingSource(
      "ce",
      () => cur,
      () => ce,
      config,
      null,
    );
    expect(result.resolved).toBe("ce");
  });

  it("falls back to ce when auto and cur probe fails", async () => {
    const executor: AthenaExecutor = {
      executeQuery: vi.fn().mockRejectedValue(new Error("no athena")),
    };
    const cur = new CurSource(executor, config);
    const ce = new CeSource({ getCostAndUsage: vi.fn().mockResolvedValue([]) }, config);
    const result = await resolveBillingSource(
      "auto",
      () => cur,
      () => ce,
      config,
      executor,
    );
    expect(result.resolved).toBe("ce");
  });

  it("uses cur when auto and probe succeeds", async () => {
    const executor: AthenaExecutor = {
      executeQuery: vi.fn().mockResolvedValue([]),
    };
    const cur = new CurSource(executor, {
      ...config,
      athena: { ...config.athena, output_location: "s3://x/" },
    });
    const ce = new CeSource({ getCostAndUsage: vi.fn() }, config);
    const result = await resolveBillingSource(
      "auto",
      () => cur,
      () => ce,
      { ...config, athena: { ...config.athena, output_location: "s3://x/" } },
      executor,
    );
    expect(result.resolved).toBe("cur");
  });

  it("throws when auto and both probes fail", async () => {
    const executor: AthenaExecutor = {
      executeQuery: vi.fn().mockRejectedValue(new Error("no athena")),
    };
    const cur = new CurSource(executor, config);
    const ce = new CeSource(
      {
        getCostAndUsage: vi.fn().mockRejectedValue(new Error("no ce")),
      },
      config,
    );
    await expect(
      resolveBillingSource(
        "auto",
        () => cur,
        () => ce,
        config,
        executor,
      ),
    ).rejects.toThrow("Could not use CUR");
  });
});
