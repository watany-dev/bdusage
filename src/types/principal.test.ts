import { describe, expect, it } from "vitest";
import {
  assertCurPrincipalFilter,
  formatPrincipalFilter,
  parsePrincipalTag,
  principalFilterSql,
} from "./principal.js";

describe("principalFilterSql", () => {
  it("filters self arn", () => {
    const sql = principalFilterSql({
      kind: "self",
      arn: "arn:aws:sts::123:assumed-role/Dev/alice",
    });
    expect(sql).toContain("line_item_iam_principal = ");
    expect(sql).toContain("alice");
  });

  it("aggregates role sessions", () => {
    const sql = principalFilterSql({
      kind: "role",
      roleArn: "arn:aws:iam::123:role/BedrockDeveloper",
    });
    expect(sql).toContain("LIKE");
    expect(sql).toContain("BedrockDeveloper/%");
  });

  it("escapes single quotes in arn", () => {
    const sql = principalFilterSql({ kind: "arn", arn: "arn:aws:sts::1:assumed-role/R/O'Brien" });
    expect(sql).toContain("O''Brien");
  });

  it("allows all principals", () => {
    expect(principalFilterSql({ kind: "all" })).toBe("1 = 1");
  });

  it("rejects tag filter in SQL", () => {
    expect(() => principalFilterSql({ kind: "tag", key: "u", value: "a" })).toThrow(
      "not valid for CUR",
    );
  });
});

describe("formatPrincipalFilter", () => {
  it("formats role, tag, and all", () => {
    expect(formatPrincipalFilter({ kind: "role", roleArn: "arn:aws:iam::1:role/R" })).toContain(
      "/*",
    );
    expect(formatPrincipalFilter({ kind: "tag", key: "user", value: "alice" })).toBe(
      "tag:user=alice",
    );
    expect(formatPrincipalFilter({ kind: "all" })).toContain("admin");
  });
});

describe("assertCurPrincipalFilter", () => {
  it("rejects tag filter for cur", () => {
    expect(() => assertCurPrincipalFilter({ kind: "tag", key: "u", value: "a" })).toThrow(
      "principal-tag",
    );
  });
});

describe("parsePrincipalTag", () => {
  it("parses key=value", () => {
    expect(parsePrincipalTag("user=alice")).toEqual({ key: "user", value: "alice" });
  });

  it("rejects invalid format", () => {
    expect(() => parsePrincipalTag("nope")).toThrow("Invalid --principal-tag");
  });
});
