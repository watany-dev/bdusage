import { describe, expect, it, vi } from "vitest";
import type { AthenaExecutor } from "../../aws/athena.js";
import { DEFAULT_CONFIG } from "../../config/schema.js";
import { CurAthenaSource } from "./source.js";

const athena = {
  ...DEFAULT_CONFIG.cur.athena,
  output_location: "s3://bucket/prefix/",
};
const config = {
  ...DEFAULT_CONFIG,
  cur: { ...DEFAULT_CONFIG.cur, athena },
  athena,
};

describe("CurAthenaSource", () => {
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
    const source = new CurAthenaSource(executor, config);
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

  it("fetches weekly and users rankings", async () => {
    const source = new CurAthenaSource(executor, config);
    vi.mocked(executor.executeQuery).mockResolvedValueOnce([
      {
        week_start: "2026-05-26",
        usage_type: "USE1-Claude-3.5-Sonnet-Input-Tokens",
        cost: "1",
        usage_amount: "10",
      },
    ]);
    const weekly = await source.fetchWeekly(
      { kind: "self", arn: "arn:aws:sts::1:assumed-role/R/u" },
      { since: "2026-05-01", until: "2026-06-01" },
    );
    expect(weekly[0]?.week_start).toBe("2026-05-26");

    vi.mocked(executor.executeQuery).mockResolvedValueOnce([
      {
        principal: "arn:aws:sts::1:assumed-role/R/u",
        usage_type: "T",
        cost: "5",
        usage_amount: "1",
      },
    ]);
    const users = await source.fetchUsers({ since: "2026-05-01", until: "2026-06-01" });
    expect(users[0]?.principal).toContain("assumed-role");
  });

  it("throws when output_location missing", async () => {
    const source = new CurAthenaSource({ executeQuery: vi.fn() }, DEFAULT_CONFIG);
    await expect(
      source.fetchDaily({ kind: "all" }, { since: "2026-05-01", until: "2026-06-01" }),
    ).rejects.toThrow("output_location");
  });
});
