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

function parseNumber(value: string | null | undefined): number {
  if (value == null || value === "") {
    return 0;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function mapRawDailyRows(rows: RawUsageRow[]): DailyRow[] {
  const byDate = new Map<
    string,
    { cost: number; tokens: TokenTotals; models: Map<string, number> }
  >();

  for (const row of rows) {
    const date = row.usage_date;
    if (!date) {
      continue;
    }
    let bucket = byDate.get(date);
    if (!bucket) {
      bucket = { cost: 0, tokens: emptyTokenTotals(), models: new Map() };
      byDate.set(date, bucket);
    }
    bucket.cost += row.cost;
    addUsageAmount(bucket.tokens, row.usage_type, row.usage_amount);
    const model = normalizeModelName(row.usage_type);
    bucket.models.set(model, (bucket.models.get(model) ?? 0) + row.cost);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({
      date,
      cost: bucket.cost,
      tokens: bucket.tokens,
      top_model: pickTopModel(bucket.models),
    }));
}

export function mapRawMonthlyRows(rows: RawUsageRow[]): MonthlyRow[] {
  const byMonth = new Map<
    string,
    { cost: number; tokens: TokenTotals; models: Map<string, number> }
  >();

  for (const row of rows) {
    const month = row.usage_month;
    if (!month) {
      continue;
    }
    let bucket = byMonth.get(month);
    if (!bucket) {
      bucket = { cost: 0, tokens: emptyTokenTotals(), models: new Map() };
      byMonth.set(month, bucket);
    }
    bucket.cost += row.cost;
    addUsageAmount(bucket.tokens, row.usage_type, row.usage_amount);
    const model = normalizeModelName(row.usage_type);
    bucket.models.set(model, (bucket.models.get(model) ?? 0) + row.cost);
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, bucket]) => ({
      month,
      cost: bucket.cost,
      tokens: bucket.tokens,
      top_model: pickTopModel(bucket.models),
    }));
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
