import { describe, expect, it } from "vitest";
import { logsPrincipalFilterClause } from "./filters.js";

describe("logsPrincipalFilterClause", () => {
  it("filters self arn", () => {
    const clause = logsPrincipalFilterClause({
      kind: "self",
      arn: "arn:aws:sts::1:assumed-role/R/u",
    });
    expect(clause).toContain("identity.arn");
  });

  it("filters role prefix", () => {
    const clause = logsPrincipalFilterClause({
      kind: "role",
      roleArn: "arn:aws:iam::1:role/R",
    });
    expect(clause).toContain("like");
  });

  it("rejects tag filter", () => {
    expect(() => logsPrincipalFilterClause({ kind: "tag", key: "user", value: "alice" })).toThrow(
      "principal-tag",
    );
  });
});
