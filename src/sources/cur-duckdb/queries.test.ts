import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../../config/schema.js";
import { dailyQuery as athenaDailyQuery } from "../cur-athena/queries.js";
import {
  dailyQuery,
  describeCurViewQuery,
  iamPrincipalColumnCheckQuery,
  monthlyQuery,
  sampleBedrockQuery,
} from "./queries.js";

const principal = { kind: "self" as const, arn: "arn:aws:sts::1:assumed-role/R/u" };
const range = { since: "2026-05-01", until: "2026-06-01" };

describe("cur-duckdb queries", () => {
  it("dailyQuery filters Bedrock usage against cost_and_usage_report view", () => {
    const sql = dailyQuery(DEFAULT_CONFIG, principal, range);
    expect(sql).toContain("cost_and_usage_report");
    expect(sql).toContain("AmazonBedrock");
    expect(sql).toContain("line_item_iam_principal");
    expect(sql).toContain("CAST(line_item_usage_start_date AS DATE)");
  });

  it("monthlyQuery uses strftime for DuckDB dialect", () => {
    expect(monthlyQuery(DEFAULT_CONFIG, principal, range)).toContain("strftime");
  });

  it("includes doctor helper queries", () => {
    expect(describeCurViewQuery()).toContain("DESCRIBE");
    expect(iamPrincipalColumnCheckQuery()).toContain("line_item_iam_principal");
    expect(sampleBedrockQuery()).toContain("AmazonBedrock");
  });

  it("matches Athena aggregation shape for the same inputs", () => {
    const duck = dailyQuery(DEFAULT_CONFIG, principal, range);
    const athena = athenaDailyQuery(DEFAULT_CONFIG, principal, range);
    expect(duck).toContain("SUM(line_item_unblended_cost) AS cost");
    expect(athena).toContain("SUM(line_item_unblended_cost) AS cost");
    expect(duck).toContain("line_item_usage_type AS usage_type");
    expect(athena).toContain("line_item_usage_type AS usage_type");
  });
});
