import { describe, expect, it } from "vitest";
import { ceMetricName, parseCeGroups } from "./cost-explorer.js";

describe("ceMetricName", () => {
  it("maps cost metrics", () => {
    expect(ceMetricName("unblended")).toBe("UnblendedCost");
    expect(ceMetricName("net_unblended")).toBe("NetUnblendedCost");
  });
});

describe("parseCeGroups", () => {
  it("parses daily usage type groups", () => {
    const rows = parseCeGroups(
      [
        {
          TimePeriod: { Start: "2026-06-01", End: "2026-06-02" },
          Groups: [
            {
              Keys: ["USE1-Claude-Input-Tokens"],
              Metrics: {
                UnblendedCost: { Amount: "1.50", Unit: "USD" },
                UsageQuantity: { Amount: "1000", Unit: "N/A" },
              },
            },
          ],
        },
      ],
      { dateKey: "usage_date", metric: "unblended" },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.usage_date).toBe("2026-06-01");
    expect(rows[0]?.cost).toBe(1.5);
    expect(rows[0]?.usage_amount).toBe(1000);
  });

  it("skips periods without start date and supports net_unblended", () => {
    const rows = parseCeGroups(
      [
        { TimePeriod: {}, Groups: [] },
        {
          TimePeriod: { Start: "2026-05-01", End: "2026-06-01" },
          Groups: [
            {
              Keys: ["T"],
              Metrics: { NetUnblendedCost: { Amount: "bad", Unit: "USD" } },
            },
          ],
        },
      ],
      { dateKey: "usage_month", metric: "net_unblended" },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.cost).toBe(0);
  });
});
