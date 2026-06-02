import { describe, expect, it, vi } from "vitest";
import { mergeConfig } from "../../config/load.js";
import { DEFAULT_CONFIG } from "../../config/schema.js";
import type { DuckDbExecutor } from "./duckdb.js";
import { CurDuckDbSource } from "./source.js";

const config = mergeConfig(DEFAULT_CONFIG, {
  cur: {
    engine: "duckdb",
    duckdb: {
      files: ["/tmp/sample.parquet"],
      hive_partitioning: false,
      union_by_name: true,
    },
    athena: DEFAULT_CONFIG.cur.athena,
  },
});

describe("CurDuckDbSource", () => {
  const executor: DuckDbExecutor = {
    executeQuery: vi.fn().mockResolvedValue([
      {
        usage_date: "2026-05-27",
        usage_type: "USE1-Claude-3.5-Sonnet-Input-Tokens",
        cost: "0.1",
        usage_amount: "1000",
      },
    ]),
    close: vi.fn(),
  };

  it("fetches daily, monthly, models, and billing freshness", async () => {
    const source = new CurDuckDbSource(executor, config);
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
    vi.mocked(executor.executeQuery).mockResolvedValueOnce([{ latest_usage: null }]);
    const unknown = await source.fetchBillingFreshness(principal, range);
    expect(unknown.status).toBe("unknown");

    vi.mocked(executor.executeQuery).mockResolvedValueOnce([
      { latest_usage: "2026-06-01 00:00:00.000" },
    ]);
    const billing = await source.fetchBillingFreshness(principal, range);
    expect(billing.status).toBe("partial");
    expect(executor.executeQuery).toHaveBeenCalled();
  });
});
