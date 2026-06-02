import { describe, expect, it } from "vitest";
import { buildTodayInsightsQuery } from "./queries.js";

describe("buildTodayInsightsQuery", () => {
  it("filters by self principal without body fields", () => {
    const query = buildTodayInsightsQuery({
      kind: "self",
      arn: "arn:aws:sts::1:assumed-role/R/u",
    });
    expect(query).toContain("identity.arn");
    expect(query).not.toMatch(/inputBodyJson/);
    expect(query).toContain("latency_p50");
  });

  it("supports role prefix filter", () => {
    const query = buildTodayInsightsQuery({
      kind: "role",
      roleArn: "arn:aws:iam::1:role/R",
    });
    expect(query).toContain("identity.arn like");
  });
});
