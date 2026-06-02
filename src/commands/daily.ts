import { type CommandContext, resolvePrincipalForBilling } from "../cli/context.js";
import { renderDailyCsv } from "../output/csv.js";
import { renderJson } from "../output/json.js";
import { renderDailyTable } from "../output/table.js";
import { parseSince, parseUntil } from "../util/dates.js";
import { buildReportMeta } from "./report-meta.js";

export async function runDaily(ctx: CommandContext): Promise<string> {
  const billing = await ctx.createBillingSource();
  const principal = await resolvePrincipalForBilling(ctx, billing);
  const since = parseSince(ctx.options.since, 30);
  const until = parseUntil(ctx.options.until);
  const range = { since, until };

  const [rows, freshness] = await Promise.all([
    billing.fetchDaily(principal, range),
    billing.fetchBillingFreshness(principal),
  ]);

  const meta = buildReportMeta(ctx, principal, range, freshness);

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
