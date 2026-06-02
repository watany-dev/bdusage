import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../../config/schema.js";
import {
  billingFreshnessQuery,
  dailyQuery,
  iamPrincipalColumnCheckQuery,
  modelsQuery,
  monthlyQuery,
  sampleBedrockQuery,
} from "./queries.js";

const principal = { kind: "self" as const, arn: "arn:aws:sts::1:assumed-role/R/u" };
const range = { since: "2026-05-01", until: "2026-06-01" };

describe("cur queries", () => {
  it("dailyQuery filters Bedrock usage and principal", () => {
    const sql = dailyQuery(DEFAULT_CONFIG, principal, range);
    expect(sql).toContain("AmazonBedrock");
    expect(sql).toContain("line_item_iam_principal");
    expect(sql).toContain("line_item_unblended_cost");
  });

  it("monthly and models queries include cost column", () => {
    expect(monthlyQuery(DEFAULT_CONFIG, principal, range)).toContain("usage_month");
    expect(modelsQuery(DEFAULT_CONFIG, principal, range)).toContain("usage_type");
  });

  it("doctor helper queries exist", () => {
    expect(iamPrincipalColumnCheckQuery(DEFAULT_CONFIG)).toContain("line_item_iam_principal");
    expect(sampleBedrockQuery(DEFAULT_CONFIG)).toContain("AmazonBedrock");
    expect(billingFreshnessQuery(DEFAULT_CONFIG, principal)).toContain("MAX");
  });

  it("uses role LIKE for principal-role", () => {
    const sql = dailyQuery(
      DEFAULT_CONFIG,
      { kind: "role", roleArn: "arn:aws:iam::1:role/Dev" },
      range,
    );
    expect(sql).toContain("LIKE 'arn:aws:iam::1:role/Dev/%'");
  });

  it("uses net_unblended cost column when configured", () => {
    const sql = dailyQuery(
      {
        ...DEFAULT_CONFIG,
        cost: { metric: "net_unblended" },
      },
      principal,
      range,
    );
    expect(sql).toContain("line_item_net_unblended_cost");
  });
});
