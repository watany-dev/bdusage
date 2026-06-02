import { describe, expect, it } from "vitest";
import {
  athenaRowsToRaw,
  mapRawDailyRows,
  mapRawModelRows,
  mapRawMonthlyRows,
  mapRawUserRows,
  mapRawWeeklyRows,
} from "./aggregate.js";

describe("mapRawDailyRows", () => {
  it("skips rows without usage_date", () => {
    expect(
      mapRawDailyRows([
        { usage_type: "T", cost: 1, usage_amount: 1 },
        { usage_date: "2026-05-01", usage_type: "T", cost: 2, usage_amount: 1 },
      ]),
    ).toHaveLength(1);
  });

  it("sorts dates ascending", () => {
    const rows = mapRawDailyRows([
      { usage_date: "2026-05-28", usage_type: "T", cost: 1, usage_amount: 1 },
      { usage_date: "2026-05-27", usage_type: "T", cost: 1, usage_amount: 1 },
    ]);
    expect(rows[0]?.date).toBe("2026-05-27");
  });

  it("aggregates cost and tokens per day", () => {
    const rows = mapRawDailyRows([
      {
        usage_date: "2026-05-27",
        usage_type: "USE1-Claude-3.5-Sonnet-Input-Tokens",
        cost: 0.1,
        usage_amount: 1000,
      },
      {
        usage_date: "2026-05-27",
        usage_type: "USE1-Claude-3.5-Sonnet-Output-Tokens",
        cost: 0.08,
        usage_amount: 500,
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.cost).toBeCloseTo(0.18);
    expect(rows[0]?.tokens.input).toBe(1000);
    expect(rows[0]?.tokens.output).toBe(500);
    expect(rows[0]?.top_model).toBe("Claude 3.5 Sonnet");
  });
});

describe("mapRawWeeklyRows", () => {
  it("aggregates by week_start", () => {
    const rows = mapRawWeeklyRows([
      {
        week_start: "2026-06-01",
        usage_type: "USE1-Claude-3.5-Sonnet-Input-Tokens",
        cost: 1,
        usage_amount: 10,
      },
      {
        week_start: "2026-06-01",
        usage_type: "USE1-Claude-3.5-Sonnet-Output-Tokens",
        cost: 2,
        usage_amount: 5,
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.week_end).toBe("2026-06-07");
    expect(rows[0]?.cost).toBe(3);
  });
});

describe("mapRawUserRows", () => {
  it("sorts principals by cost descending", () => {
    const rows = mapRawUserRows([
      { principal: "arn:a", usage_type: "T", cost: 1, usage_amount: 1 },
      { principal: "arn:b", usage_type: "T", cost: 5, usage_amount: 1 },
    ]);
    expect(rows[0]?.principal).toBe("arn:b");
  });
});

describe("mapRawMonthlyRows", () => {
  it("skips rows without usage_month", () => {
    expect(mapRawMonthlyRows([{ usage_type: "T", cost: 1, usage_amount: 1 }])).toHaveLength(0);
  });

  it("aggregates by month", () => {
    const rows = mapRawMonthlyRows([
      {
        usage_month: "2026-05",
        usage_type: "USE1-Claude-3.5-Sonnet-Input-Tokens",
        cost: 1,
        usage_amount: 10,
      },
    ]);
    expect(rows[0]?.month).toBe("2026-05");
  });

  it("sorts months ascending", () => {
    const rows = mapRawMonthlyRows([
      { usage_month: "2026-06", usage_type: "T", cost: 1, usage_amount: 1 },
      { usage_month: "2026-05", usage_type: "T", cost: 1, usage_amount: 1 },
    ]);
    expect(rows[0]?.month).toBe("2026-05");
  });
});

describe("mapRawModelRows", () => {
  it("sorts models by cost descending", () => {
    const rows = mapRawModelRows([
      { usage_type: "A-Input-Tokens", cost: 1, usage_amount: 1 },
      { usage_type: "B-Input-Tokens", cost: 5, usage_amount: 1 },
    ]);
    expect(rows[0]?.model).toBe("B");
  });

  it("groups by normalized model", () => {
    const rows = mapRawModelRows([
      {
        usage_type: "USE1-Claude-3.5-Sonnet-Input-Tokens",
        cost: 1,
        usage_amount: 100,
      },
      {
        usage_type: "USE1-Claude-3.5-Sonnet-Output-Tokens",
        cost: 2,
        usage_amount: 200,
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.model).toBe("Claude 3.5 Sonnet");
    expect(rows[0]?.cost).toBe(3);
  });
});

describe("athenaRowsToRaw", () => {
  it("maps athena column names", () => {
    const raw = athenaRowsToRaw([
      {
        usage_date: "2026-06-01",
        line_item_usage_type: "T",
        cost: "1.5",
        usage_amount: "10",
      },
    ]);
    expect(raw[0]?.usage_type).toBe("T");
    expect(raw[0]?.cost).toBe(1.5);
  });
});
