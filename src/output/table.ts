import type { DailyRow, ModelRow, MonthlyRow, ReportMeta, SummaryTotals } from "../types/report.js";
import { formatTokens, formatUsd } from "./format-numbers.js";

function headerBlock(meta: ReportMeta): string[] {
  const lines = [
    meta.version,
    `source: ${meta.sourceLabel}`,
    `profile: ${meta.profile}`,
    `principal: ${meta.principalDisplay}`,
    `period: ${meta.period.since}..${meta.period.until}`,
  ];
  if (meta.billingDataLatest) {
    lines.push(
      `billing data: ${meta.billingDataStatus}, latest line item ${meta.billingDataLatest}`,
    );
  }
  return lines;
}

export function renderDailyTable(meta: ReportMeta, rows: DailyRow[]): string {
  const lines = [...headerBlock(meta), ""];
  lines.push(padRow(["Date", "Cost", "Input", "Output", "Cache Read", "Cache Write", "Top Model"]));
  let totalCost = 0;
  const totalTokens = { input: 0, output: 0, cache_read: 0, cache_write: 0 };
  for (const row of rows) {
    totalCost += row.cost;
    totalTokens.input += row.tokens.input;
    totalTokens.output += row.tokens.output;
    totalTokens.cache_read += row.tokens.cache_read;
    totalTokens.cache_write += row.tokens.cache_write;
    lines.push(
      padRow([
        row.date,
        formatUsd(row.cost),
        formatTokens(row.tokens.input),
        formatTokens(row.tokens.output),
        formatTokens(row.tokens.cache_read),
        formatTokens(row.tokens.cache_write),
        row.top_model ?? "-",
      ]),
    );
  }
  lines.push(
    padRow([
      "Total",
      formatUsd(totalCost),
      formatTokens(totalTokens.input),
      formatTokens(totalTokens.output),
      formatTokens(totalTokens.cache_read),
      formatTokens(totalTokens.cache_write),
      "",
    ]),
  );
  return `${lines.join("\n")}\n`;
}

export function renderMonthlyTable(meta: ReportMeta, rows: MonthlyRow[]): string {
  const lines = [...headerBlock(meta), ""];
  lines.push(
    padRow(["Month", "Cost", "Input", "Output", "Cache Read", "Cache Write", "Top Model"]),
  );
  for (const row of rows) {
    lines.push(
      padRow([
        row.month,
        formatUsd(row.cost),
        formatTokens(row.tokens.input),
        formatTokens(row.tokens.output),
        formatTokens(row.tokens.cache_read),
        formatTokens(row.tokens.cache_write),
        row.top_model ?? "-",
      ]),
    );
  }
  return `${lines.join("\n")}\n`;
}

export function renderModelsTable(meta: ReportMeta, rows: ModelRow[]): string {
  const lines = [...headerBlock(meta), ""];
  lines.push(padRow(["Model", "Cost", "Input", "Output", "Cache Read", "Cache Write"]));
  for (const row of rows) {
    lines.push(
      padRow([
        row.model,
        formatUsd(row.cost),
        formatTokens(row.tokens.input),
        formatTokens(row.tokens.output),
        formatTokens(row.tokens.cache_read),
        formatTokens(row.tokens.cache_write),
      ]),
    );
  }
  return `${lines.join("\n")}\n`;
}

export function renderSummaryTable(meta: ReportMeta, totals: SummaryTotals): string {
  const lines = [
    ...headerBlock(meta),
    "",
    `This month: ${formatUsd(totals.this_month)}`,
    `Yesterday:   ${formatUsd(totals.yesterday)}`,
    `Top model:   ${totals.top_model ?? "-"}`,
    `Top driver:  ${totals.top_driver ?? "-"}`,
    "",
  ];
  return lines.join("\n");
}

function padRow(cells: string[]): string {
  const widths = [12, 10, 10, 10, 12, 12, 20];
  return cells
    .map((cell, i) => {
      const width = widths[i] ?? 12;
      return cell.padEnd(width);
    })
    .join(" ")
    .trimEnd();
}
