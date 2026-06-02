import { describe, expect, it, vi } from "vitest";
import type { AthenaExecutor } from "../../aws/athena.js";
import { DEFAULT_CONFIG } from "../../config/schema.js";
import { CurSource } from "./source.js";

const config = {
  ...DEFAULT_CONFIG,
  athena: {
    ...DEFAULT_CONFIG.athena,
    output_location: "s3://bucket/prefix/",
  },
};

describe("CurSource", () => {
  const executor: AthenaExecutor = {
    executeQuery: vi.fn().mockResolvedValue([
      {
        usage_date: "2026-05-27",
        usage_type: "USE1-Claude-3.5-Sonnet-Input-Tokens",
        cost: "0.1",
        usage_amount: "1000",
      },
    ]),
  };

  it("fetches daily, monthly, models, billing freshness", async () => {
    const source = new CurSource(executor, config);
    const principal = { kind: "self" as const, arn: "arn:aws:sts::1:assumed-role/R/u" };
    const range = { since: "2026-05-01", until: "2026-06-01" };

    await source.fetchDaily(principal, range);
    vi.mocked(executor.executeQuery).mockResolvedValueOnce([
      { usage_month: "2026-05", usage_type: "T", cost: "1", usage_amount: "1" },
    ]);
    await source.fetchMonthly(principal, range);
    vi.mocked(executor.executeQuery).mockResolvedValueOnce([
      { usage_type: "T", cost: "1", usage_amount: "1" },
    ]);
    await source.fetchModels(principal, range);
    vi.mocked(executor.executeQuery).mockResolvedValueOnce([
      { latest_usage: "2026-06-01 00:00:00.000" },
    ]);
    vi.mocked(executor.executeQuery).mockReset();
    vi.mocked(executor.executeQuery).mockResolvedValueOnce([{}]);
    const emptyBilling = await source.fetchBillingFreshness(principal);
    expect(emptyBilling.status).toBe("unknown");

    vi.mocked(executor.executeQuery).mockResolvedValueOnce([
      { latest_usage: "2026-06-01 00:00:00.000" },
    ]);
    const billing = await source.fetchBillingFreshness(principal);
    expect(billing.latest).toBe("2026-06-01 00:00:00.000");
    expect(executor.executeQuery).toHaveBeenCalled();
  });

  it("throws when output_location missing", async () => {
    const source = new CurSource({ executeQuery: vi.fn() }, DEFAULT_CONFIG);
    await expect(
      source.fetchDaily({ kind: "all" }, { since: "2026-05-01", until: "2026-06-01" }),
    ).rejects.toThrow("output_location");
  });
});
