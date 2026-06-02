import { describe, expect, it } from "vitest";
import type { ReportMeta } from "../types/report.js";
import {
  renderDailyTable,
  renderModelsTable,
  renderMonthlyTable,
  renderSummaryTable,
} from "./table.js";

const meta: ReportMeta = {
  version: "bdusage v0.1.0",
  source: "cur",
  sourceLabel: "CUR 2.0 actual",
  profile: "default",
  region: "us-east-1",
  principal: { kind: "self", arn: "arn:aws:sts::1:assumed-role/R/u" },
  principalDisplay: "arn:aws:sts::1:assumed-role/R/u",
  period: { since: "2026-06-01", until: "2026-06-02" },
  billingDataStatus: "partial",
  billingDataLatest: "2026-06-01",
  currency: "USD",
};

describe("table renderers", () => {
  it("renderDailyTable includes source header and rows", () => {
    const out = renderDailyTable(meta, [
      {
        date: "2026-06-01",
        cost: 0.18,
        tokens: { input: 1000, output: 200, cache_read: 0, cache_write: 0 },
        top_model: "Claude Sonnet",
      },
    ]);
    expect(out).toContain("source: CUR 2.0 actual");
    expect(out).toContain("Total");
  });

  it("renderMonthlyTable and renderModelsTable", () => {
    expect(
      renderMonthlyTable(meta, [
        {
          month: "2026-06",
          cost: 1,
          tokens: { input: 0, output: 0, cache_read: 0, cache_write: 0 },
          top_model: "M",
        },
      ]),
    ).toContain("Month");
    expect(
      renderModelsTable(meta, [
        {
          model: "Claude Sonnet",
          cost: 1,
          tokens: { input: 1, output: 2, cache_read: 3, cache_write: 4 },
          usage_types: ["X"],
        },
      ]),
    ).toContain("Claude Sonnet");
  });

  it("renderSummaryTable", () => {
    const out = renderSummaryTable(meta, {
      this_month: 12,
      yesterday: 3,
      top_model: "Claude",
      top_driver: "output tokens",
    });
    expect(out).toContain("This month: $12.00");
  });
});
