import { describe, expect, it } from "vitest";
import { assertCePrincipalFilter } from "../../types/principal.js";
import { buildCeFilter } from "./filters.js";

describe("buildCeFilter", () => {
  it("filters Bedrock service only for --all", () => {
    expect(buildCeFilter({ kind: "all" })).toEqual({
      Dimensions: { Key: "SERVICE", Values: ["Amazon Bedrock"] },
    });
  });

  it("adds tag filter for principal-tag", () => {
    expect(buildCeFilter({ kind: "tag", key: "user", value: "alice" })).toEqual({
      And: [
        { Dimensions: { Key: "SERVICE", Values: ["Amazon Bedrock"] } },
        { Tags: { Key: "user", Values: ["alice"] } },
      ],
    });
  });

  it("rejects IAM principal filters", () => {
    expect(() =>
      assertCePrincipalFilter({ kind: "self", arn: "arn:aws:iam::1:user/alice" }),
    ).toThrow("Cost Explorer cannot filter by IAM principal");
  });

  it("throws on unexpected principal after assert", () => {
    expect(() => buildCeFilter({ kind: "self", arn: "arn:1" })).toThrow();
  });
});
