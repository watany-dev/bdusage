import { type CommandContext, resolvePrincipalForBilling } from "../cli/context.js";
import { renderModelsCsv } from "../output/csv.js";
import { renderJson } from "../output/json.js";
import { renderModelsTable } from "../output/table.js";
import { monthStart, parseSince, parseUntil, todayUtc } from "../util/dates.js";
import { buildReportMeta } from "./report-meta.js";

export async function runModels(ctx: CommandContext): Promise<string> {
  const billing = await ctx.createBillingSource();
  const principal = await resolvePrincipalForBilling(ctx, billing);
  const since = ctx.options.since ?? monthStart(todayUtc());
  const until = parseUntil(ctx.options.until);
  const range = {
    since: /^\d{4}-\d{2}-\d{2}$/.test(since) ? since : parseSince(since, 30),
    until,
  };

  const [rows, freshness] = await Promise.all([
    billing.fetchModels(principal, range),
    billing.fetchBillingFreshness(principal),
  ]);

  const meta = buildReportMeta(ctx, principal, range, freshness);
  const envelope = { meta, rows };

  switch (ctx.outputFormat) {
    case "json":
      return renderJson(envelope);
    case "csv":
      return renderModelsCsv(meta, rows);
    default:
      return renderModelsTable(meta, rows);
  }
}
