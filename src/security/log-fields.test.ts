import { describe, expect, it } from "vitest";
import { assertSafeLogInsightsQuery, buildAllowedFieldsClause } from "./log-fields.js";

describe("log-fields", () => {
  it("lists allowed fields without body json", () => {
    expect(buildAllowedFieldsClause()).not.toMatch(/inputBodyJson/);
    expect(buildAllowedFieldsClause()).toContain("identity.arn");
  });

  it("rejects queries referencing body fields", () => {
    expect(() => assertSafeLogInsightsQuery("fields input.inputBodyJson")).toThrow("body fields");
  });

  it("allows latency metric path", () => {
    expect(() =>
      assertSafeLogInsightsQuery("fields output.outputBodyJson.metrics.latencyMs"),
    ).not.toThrow();
  });
});
