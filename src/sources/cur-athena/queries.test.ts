import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../../config/schema.js";
import { usersByPrincipalQuery, weeklyQuery } from "./queries.js";

describe("weeklyQuery", () => {
  it("groups by ISO week start", () => {
    const sql = weeklyQuery(
      DEFAULT_CONFIG,
      { kind: "all" },
      { since: "2026-06-01", until: "2026-07-01" },
    );
    expect(sql).toContain("week_start");
    expect(sql).toContain("day_of_week");
  });
});

describe("usersByPrincipalQuery", () => {
  it("groups by line_item_iam_principal", () => {
    const sql = usersByPrincipalQuery(DEFAULT_CONFIG, { since: "2026-06-01", until: "2026-07-01" });
    expect(sql).toContain("line_item_iam_principal");
    expect(sql).not.toContain("line_item_iam_principal =");
  });
});
