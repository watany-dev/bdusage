import type { CommandContext } from "../cli/context.js";
import { renderDailyCsv } from "../output/csv.js";
import { renderJson } from "../output/json.js";
import { renderDailyTable } from "../output/table.js";
import { parseSince, parseUntil } from "../util/dates.js";
import { buildReportMeta } from "./report-meta.js";

export async function runDaily(ctx: CommandContext): Promise<string> {
  const principal = await ctx.resolvePrincipal();
  const since = parseSince(ctx.options.since, 30);
  const until = parseUntil(ctx.options.until);
  const range = { since, until };

  const source = ctx.createCurSource();
  const [rows, billing] = await Promise.all([
    source.fetchDaily(principal, range),
    source.fetchBillingFreshness(principal),
  ]);

  const meta = buildReportMeta(ctx, principal, range, billing);

  const envelope = { meta, rows };

  switch (ctx.outputFormat) {
    case "json":
      return renderJson(envelope);
    case "csv":
      return renderDailyCsv(meta, rows);
    default:
      return renderDailyTable(meta, rows);
  }
}
