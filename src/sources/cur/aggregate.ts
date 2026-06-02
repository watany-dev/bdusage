import { normalizeModelName, pickTopModel } from "../../bedrock/model-normalizer.js";
import { addUsageAmount, emptyTokenTotals } from "../../bedrock/token-types.js";
import type { DailyRow, ModelRow, MonthlyRow, TokenTotals } from "../../types/report.js";

interface RawUsageRow {
  usage_date?: string;
  usage_month?: string;
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
    return raw;
  });
}
