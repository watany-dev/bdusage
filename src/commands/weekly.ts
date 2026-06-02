import { type CommandContext, resolvePrincipalForBilling } from "../cli/context.js";
import { renderWeeklyCsv } from "../output/csv.js";
import { renderJson } from "../output/json.js";
import { renderWeeklyTable } from "../output/table.js";
import { parseSince, parseUntil } from "../util/dates.js";
import { buildReportMeta } from "./report-meta.js";

export async function runWeekly(ctx: CommandContext): Promise<string> {
  const billing = await ctx.createBillingSource();
  const principal = await resolvePrincipalForBilling(ctx, billing);
  const since = parseSince(ctx.options.since, 90);
  const until = parseUntil(ctx.options.until);
  const range = { since, until };

  const rows = await billing.fetchWeekly(principal, range);
  const freshness =
    billing.peekBillingFreshness?.() ?? (await billing.fetchBillingFreshness(principal, range));

  const meta = buildReportMeta(ctx, principal, range, freshness);
  const envelope = { meta, rows };

  switch (ctx.outputFormat) {
    case "json":
      return renderJson(envelope);
    case "csv":
      return renderWeeklyCsv(meta, rows);
    default:
      return renderWeeklyTable(meta, rows);
  }
}
