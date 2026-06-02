import type {
  DailyRow,
  EstimateReportMeta,
  ModelRow,
  MonthlyRow,
  ReportMeta,
  SummaryTotals,
  TodayReport,
  UserRow,
  WeeklyRow,
} from "../types/report.js";
import { formatWeekLabel } from "../util/weeks.js";
import { formatEstimateUsd, formatTokens, formatUsd } from "./format-numbers.js";

function headerBlock(meta: ReportMeta): string[] {
  const lines = [
    meta.version,
    `source: ${meta.sourceLabel}`,
    ...(meta.engineLabel ? [`engine: ${meta.engineLabel}`] : []),
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

export function renderWeeklyTable(meta: ReportMeta, rows: WeeklyRow[]): string {
  const lines = [...headerBlock(meta), ""];
  lines.push(padRow(["Week", "Cost", "Input", "Output", "Cache Read", "Cache Write", "Top Model"]));
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
        formatWeekLabel(row.week_start, row.week_end),
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

export function renderUsersTable(meta: ReportMeta, rows: UserRow[]): string {
  const lines = [...headerBlock(meta), ""];
  lines.push(
    padUsersRow(["Principal", "Cost", "Input", "Output", "Cache Read", "Cache Write", "Top Model"]),
  );
  for (const row of rows) {
    lines.push(
      padUsersRow([
        shortenPrincipal(row.principal),
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

function estimateHeaderBlock(meta: EstimateReportMeta): string[] {
  return [
    meta.version,
    `source: ${meta.sourceLabel}`,
    `profile: ${meta.profile}`,
    `principal: ${meta.principalDisplay}`,
    `period: ${meta.period.since}`,
    meta.estimateDisclaimer,
  ];
}

export function renderTodayTable(meta: EstimateReportMeta, report: TodayReport): string {
  const costLine =
    report.estimated_cost === null
      ? "Estimated cost: unavailable (Price List API)"
      : `Estimated cost: ${formatEstimateUsd(report.estimated_cost)}`;
  const latency =
    report.latency_ms.p50 === null
      ? "-"
      : `p50 ${Math.round(report.latency_ms.p50)} ms, p95 ${Math.round(report.latency_ms.p95 ?? 0)} ms`;
  const lines = [
    ...estimateHeaderBlock(meta),
    "",
    `Requests:      ${report.requests}`,
    `Input tokens:  ${formatTokens(report.tokens.input)}`,
    `Output tokens: ${formatTokens(report.tokens.output)}`,
    `Cache read:    ${formatTokens(report.tokens.cache_read)}`,
    `Cache write:   ${formatTokens(report.tokens.cache_write)}`,
    `Latency:       ${latency}`,
    costLine,
    `Top model:     ${report.top_model ?? "-"}`,
    "",
  ];
  return lines.join("\n");
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

function padUsersRow(cells: string[]): string {
  const widths = [44, 10, 10, 10, 12, 12, 20];
  return cells
    .map((cell, i) => {
      const width = widths[i] ?? 12;
      return cell.padEnd(width);
    })
    .join(" ")
    .trimEnd();
}

function shortenPrincipal(arn: string): string {
  const sessionIdx = arn.indexOf("/");
  if (sessionIdx > 0 && arn.includes(":assumed-role/")) {
    return arn.slice(sessionIdx + 1);
  }
  if (arn.length > 52) {
    return `…${arn.slice(-48)}`;
  }
  return arn;
}
