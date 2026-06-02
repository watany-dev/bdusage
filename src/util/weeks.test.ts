import { describe, expect, it } from "vitest";
import { aggregateDailyToWeekly, weekEndFromStart, weekStartMonday } from "./weeks.js";

describe("weekStartMonday", () => {
  it("returns Monday for a Wednesday", () => {
    expect(weekStartMonday("2026-06-04")).toBe("2026-06-01");
  });

  it("returns same Monday when already Monday", () => {
    expect(weekStartMonday("2026-06-01")).toBe("2026-06-01");
  });

  it("rolls Sunday back to previous Monday", () => {
    expect(weekStartMonday("2026-06-07")).toBe("2026-06-01");
  });
});

describe("weekEndFromStart", () => {
  it("is six days after week start", () => {
    expect(weekEndFromStart("2026-06-01")).toBe("2026-06-07");
  });
});

describe("aggregateDailyToWeekly", () => {
  it("sums costs in the same ISO week", () => {
    const rows = aggregateDailyToWeekly([
      {
        date: "2026-06-01",
        cost: 1,
        tokens: { input: 10, output: 1, cache_read: 0, cache_write: 0 },
        top_model: "A",
      },
      {
        date: "2026-06-02",
        cost: 2,
        tokens: { input: 20, output: 2, cache_read: 0, cache_write: 0 },
        top_model: "B",
      },
      {
        date: "2026-06-08",
        cost: 4,
        tokens: { input: 4, output: 0, cache_read: 0, cache_write: 0 },
        top_model: null,
      },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.cost).toBe(3);
    expect(rows[0]?.tokens.input).toBe(30);
    expect(rows[1]?.cost).toBe(4);
  });
});
