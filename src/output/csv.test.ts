import { describe, expect, it } from "vitest";
import type { ReportMeta } from "../types/report.js";
import { renderDailyCsv, renderModelsCsv, renderMonthlyCsv } from "./csv.js";

const meta: ReportMeta = {
  version: "bdusage v0.1.0",
  source: "cur",
  sourceLabel: "CUR 2.0 actual",
  profile: "default",
  region: "us-east-1",
  principal: { kind: "self", arn: "arn:1" },
  principalDisplay: "arn:1",
  period: { since: "2026-06-01", until: "2026-06-02" },
  billingDataStatus: "unknown",
  billingDataLatest: null,
  currency: "USD",
};

describe("csv renderers", () => {
  it("renders daily, monthly, models csv", () => {
    expect(renderDailyCsv(meta, [])).toContain("# source:");
    expect(
      renderMonthlyCsv(meta, [
        {
          month: "2026-06",
          cost: 1,
          tokens: { input: 1, output: 2, cache_read: 3, cache_write: 4 },
          top_model: "M",
        },
      ]),
    ).toContain("2026-06");
    expect(
      renderModelsCsv(meta, [
        {
          model: 'Claude "Pro"',
          cost: 1,
          tokens: { input: 1, output: 2, cache_read: 3, cache_write: 4 },
          usage_types: [],
        },
      ]),
    ).toContain('""');
  });
});
