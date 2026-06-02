import type { DailyRow, ModelRow, MonthlyRow, ReportMeta } from "../types/report.js";

function metaComments(meta: ReportMeta): string[] {
  return [
    `# source: ${meta.sourceLabel}`,
    `# profile: ${meta.profile}`,
    `# principal: ${meta.principalDisplay}`,
    `# period: ${meta.period.since}..${meta.period.until}`,
  ];
}

export function renderDailyCsv(meta: ReportMeta, rows: DailyRow[]): string {
  const lines = [...metaComments(meta), "date,cost,input,output,cache_read,cache_write,top_model"];
  for (const row of rows) {
    lines.push(
      [
        row.date,
        row.cost.toFixed(4),
        row.tokens.input,
        row.tokens.output,
        row.tokens.cache_read,
        row.tokens.cache_write,
        row.top_model ?? "",
      ].join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

export function renderMonthlyCsv(meta: ReportMeta, rows: MonthlyRow[]): string {
  const lines = [...metaComments(meta), "month,cost,input,output,cache_read,cache_write,top_model"];
  for (const row of rows) {
    lines.push(
      [
        row.month,
        row.cost.toFixed(4),
        row.tokens.input,
        row.tokens.output,
        row.tokens.cache_read,
        row.tokens.cache_write,
        row.top_model ?? "",
      ].join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

export function renderModelsCsv(meta: ReportMeta, rows: ModelRow[]): string {
  const lines = [...metaComments(meta), "model,cost,input,output,cache_read,cache_write"];
  for (const row of rows) {
    lines.push(
      [
        `"${row.model.replace(/"/g, '""')}"`,
        row.cost.toFixed(4),
        row.tokens.input,
        row.tokens.output,
        row.tokens.cache_read,
        row.tokens.cache_write,
      ].join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}
