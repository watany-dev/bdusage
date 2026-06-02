import { describe, expect, it } from "vitest";
import { parseBillingFreshnessFromRows } from "./freshness.js";

describe("parseBillingFreshnessFromRows", () => {
  it("returns unknown when no latest_usage column", () => {
    expect(parseBillingFreshnessFromRows([{ usage_type: "T" }])).toEqual({
      status: "unknown",
      latest: null,
    });
  });

  it("returns partial with latest timestamp", () => {
    expect(
      parseBillingFreshnessFromRows([{ usage_type: "T", latest_usage: "2026-06-01 00:00:00.000" }]),
    ).toEqual({
      status: "partial",
      latest: "2026-06-01 00:00:00.000",
    });
  });
});
