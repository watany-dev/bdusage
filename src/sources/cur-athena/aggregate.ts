import { normalizeModelName, pickTopModel } from "../../bedrock/model-normalizer.js";
import { addUsageAmount, emptyTokenTotals } from "../../bedrock/token-types.js";
import type {
  DailyRow,
  ModelRow,
  MonthlyRow,
  TokenTotals,
  UserRow,
  WeeklyRow,
} from "../../types/report.js";
import { weekEndFromStart, weekStartMonday } from "../../util/weeks.js";

interface RawUsageRow {
  usage_date?: string;
  usage_month?: string;
  week_start?: string;
  principal?: string;
  usage_type: string;
  cost: number;
  usage_amount: number;
}

interface PeriodBucket {
  cost: number;
  tokens: TokenTotals;
  models: Map<string, number>;
}

function parseNumber(value: string | null | undefined): number {
  if (value == null || value === "") {
    return 0;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapRawPeriodRows<TRow>(
  rows: RawUsageRow[],
  periodKey: (row: RawUsageRow) => string | undefined,
  toRow: (key: string, bucket: PeriodBucket) => TRow,
): TRow[] {
  const byPeriod = new Map<string, PeriodBucket>();

  for (const row of rows) {
    const key = periodKey(row);
    if (!key) {
      continue;
    }
    let bucket = byPeriod.get(key);
    if (!bucket) {
      bucket = { cost: 0, tokens: emptyTokenTotals(), models: new Map() };
      byPeriod.set(key, bucket);
    }
    bucket.cost += row.cost;
    addUsageAmount(bucket.tokens, row.usage_type, row.usage_amount);
    const model = normalizeModelName(row.usage_type);
    bucket.models.set(model, (bucket.models.get(model) ?? 0) + row.cost);
  }

  return [...byPeriod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, bucket]) => toRow(key, bucket));
}

export function mapRawDailyRows(rows: RawUsageRow[]): DailyRow[] {
  return mapRawPeriodRows(
    rows,
    (row) => row.usage_date,
    (date, bucket) => ({
      date,
      cost: bucket.cost,
      tokens: bucket.tokens,
      top_model: pickTopModel(bucket.models),
    }),
  );
}

function mapRowsToWeekly(
  rows: RawUsageRow[],
  weekKey: (row: RawUsageRow) => string | undefined,
): WeeklyRow[] {
  return mapRawPeriodRows(rows, weekKey, (week_start, bucket) => ({
    week_start,
    week_end: weekEndFromStart(week_start),
    cost: bucket.cost,
    tokens: bucket.tokens,
    top_model: pickTopModel(bucket.models),
  }));
}

/** Build weekly rows from daily-granularity raw rows (usage_date + usage_type). */
export function mapRawRowsToWeekly(rows: RawUsageRow[]): WeeklyRow[] {
  const weekStartByDate = new Map<string, string>();
  return mapRowsToWeekly(rows, (row) => {
    const date = row.usage_date;
    if (!date) {
      return undefined;
    }
    let weekStart = weekStartByDate.get(date);
    if (weekStart === undefined) {
      weekStart = weekStartMonday(date);
      weekStartByDate.set(date, weekStart);
    }
    return weekStart;
  });
}

export function mapRawWeeklyRows(rows: RawUsageRow[]): WeeklyRow[] {
  return mapRowsToWeekly(rows, (row) => row.week_start);
}

export function mapRawUserRows(rows: RawUsageRow[]): UserRow[] {
  const byPrincipal = new Map<
    string,
    { cost: number; tokens: TokenTotals; models: Map<string, number> }
  >();

  for (const row of rows) {
    const principal = row.principal?.trim();
    if (!principal) {
      continue;
    }
    let bucket = byPrincipal.get(principal);
    if (!bucket) {
      bucket = { cost: 0, tokens: emptyTokenTotals(), models: new Map() };
      byPrincipal.set(principal, bucket);
    }
    bucket.cost += row.cost;
    addUsageAmount(bucket.tokens, row.usage_type, row.usage_amount);
    const model = normalizeModelName(row.usage_type);
    bucket.models.set(model, (bucket.models.get(model) ?? 0) + row.cost);
  }

  return [...byPrincipal.entries()]
    .sort(([, a], [, b]) => b.cost - a.cost)
    .map(([principal, bucket]) => ({
      principal,
      cost: bucket.cost,
      tokens: bucket.tokens,
      top_model: pickTopModel(bucket.models),
    }));
}

export function mapRawMonthlyRows(rows: RawUsageRow[]): MonthlyRow[] {
  return mapRawPeriodRows(
    rows,
    (row) => row.usage_month,
    (month, bucket) => ({
      month,
      cost: bucket.cost,
      tokens: bucket.tokens,
      top_model: pickTopModel(bucket.models),
    }),
  );
}

export function mapRawModelRows(rows: RawUsageRow[]): ModelRow[] {
  const byModel = new Map<
    string,
    { cost: number; tokens: TokenTotals; usage_types: Set<string> }
  >();

  for (const row of rows) {
    const model = normalizeModelName(row.usage_type);
    let bucket = byModel.get(model);
    if (!bucket) {
      bucket = { cost: 0, tokens: emptyTokenTotals(), usage_types: new Set() };
      byModel.set(model, bucket);
    }
    bucket.cost += row.cost;
    addUsageAmount(bucket.tokens, row.usage_type, row.usage_amount);
    bucket.usage_types.add(row.usage_type);
  }

  return [...byModel.entries()]
    .sort(([, a], [, b]) => b.cost - a.cost)
    .map(([model, bucket]) => ({
      model,
      cost: bucket.cost,
      tokens: bucket.tokens,
      usage_types: [...bucket.usage_types].sort(),
    }));
}

export function athenaRowsToRaw(rows: Array<Record<string, string | null>>): RawUsageRow[] {
  return rows.map((row) => {
    const raw: RawUsageRow = {
      usage_type: row["usage_type"] ?? row["line_item_usage_type"] ?? "",
      cost: parseNumber(row["cost"]),
      usage_amount: parseNumber(row["usage_amount"]),
    };
    const usageDate = row["usage_date"];
    if (usageDate) {
      raw.usage_date = usageDate;
    }
    const usageMonth = row["usage_month"];
    if (usageMonth) {
      raw.usage_month = usageMonth;
    }
    const weekStart = row["week_start"];
    if (weekStart) {
      raw.week_start = weekStart;
    }
    const principal = row["principal"];
    if (principal) {
      raw.principal = principal;
    }
    return raw;
  });
}
