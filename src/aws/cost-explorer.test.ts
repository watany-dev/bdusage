import { describe, expect, it, vi } from "vitest";
import { ceMetricName, LiveCostExplorerClient, parseCeGroups } from "./cost-explorer.js";

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

describe("LiveCostExplorerClient", () => {
  it("follows NextPageToken until exhausted", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({
        ResultsByTime: [{ TimePeriod: { Start: "2026-06-01" }, Groups: [] }],
        NextPageToken: "page-2",
      })
      .mockResolvedValueOnce({
        ResultsByTime: [{ TimePeriod: { Start: "2026-06-02" }, Groups: [] }],
      });
    const client = new LiveCostExplorerClient({ send } as never);
    const results = await client.getCostAndUsage({
      TimePeriod: { Start: "2026-06-01", End: "2026-06-03" },
      Granularity: "DAILY",
      Metrics: ["UnblendedCost"],
    });
    expect(results).toHaveLength(2);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1]?.[0].input.NextPageToken).toBe("page-2");
  });
});
