import type { CommandContext } from "../cli/context.js";
import { renderMonthlyCsv } from "../output/csv.js";
import { renderJson } from "../output/json.js";
import { renderMonthlyTable } from "../output/table.js";
import { monthStart, parseSince, parseUntil, todayUtc } from "../util/dates.js";
import { buildReportMeta } from "./report-meta.js";

export async function runMonthly(ctx: CommandContext): Promise<string> {
  const principal = await ctx.resolvePrincipal();
  const since = ctx.options.since ?? monthStart(todayUtc());
  const until = parseUntil(ctx.options.until);
  const range = {
    since: /^\d{4}-\d{2}-\d{2}$/.test(since) ? since : parseSince(since, 365),
    until,
  };

  const source = ctx.createCurSource();
  const [rows, billing] = await Promise.all([
    source.fetchMonthly(principal, range),
    source.fetchBillingFreshness(principal),
  ]);

  const meta = buildReportMeta(ctx, principal, range, billing);
  const envelope = { meta, rows };

  switch (ctx.outputFormat) {
    case "json":
      return renderJson(envelope);
    case "csv":
      return renderMonthlyCsv(meta, rows);
    default:
      return renderMonthlyTable(meta, rows);
  }
}
