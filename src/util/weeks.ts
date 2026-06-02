import { pickTopModel } from "../bedrock/model-normalizer.js";
import type { DailyRow, WeeklyRow } from "../types/report.js";

/** ISO week starts on Monday (UTC). */
export function weekStartMonday(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function weekEndFromStart(weekStart: string): string {
  const d = new Date(`${weekStart}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}

export function formatWeekLabel(weekStart: string, weekEnd: string): string {
  return `${weekStart}..${weekEnd}`;
}

/** Roll up pre-aggregated daily rows into ISO weeks (fallback; top_model is approximate). */
export function aggregateDailyToWeekly(rows: DailyRow[]): WeeklyRow[] {
  const byWeek = new Map<string, WeeklyRow & { models: Map<string, number> }>();

  for (const row of rows) {
    const week_start = weekStartMonday(row.date);
    const week_end = weekEndFromStart(week_start);
    let bucket = byWeek.get(week_start);
    if (!bucket) {
      bucket = {
        week_start,
        week_end,
        cost: 0,
        tokens: { input: 0, output: 0, cache_read: 0, cache_write: 0 },
        top_model: null,
        models: new Map(),
      };
      byWeek.set(week_start, bucket);
    }
    bucket.cost += row.cost;
    bucket.tokens.input += row.tokens.input;
    bucket.tokens.output += row.tokens.output;
    bucket.tokens.cache_read += row.tokens.cache_read;
    bucket.tokens.cache_write += row.tokens.cache_write;
    if (row.top_model) {
      bucket.models.set(row.top_model, (bucket.models.get(row.top_model) ?? 0) + row.cost);
    }
  }

  return [...byWeek.values()]
    .sort((a, b) => a.week_start.localeCompare(b.week_start))
    .map(({ models, ...week }) => ({
      ...week,
      top_model: pickTopModel(models),
    }));
}
