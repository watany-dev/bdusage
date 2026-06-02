import { type CommandContext, resolvePrincipalForBilling } from "../cli/context.js";
import { renderJson } from "../output/json.js";
import type { BillingSource } from "../sources/billing-source.js";
import type { PrincipalFilter } from "../types/principal.js";
import type { ReportMeta } from "../types/report.js";
import type { DateRange } from "../util/dates.js";
import { buildReportMeta } from "./report-meta.js";

export async function runBillingReport<TRow>(
  ctx: CommandContext,
  range: DateRange,
  fetchRows: (
    billing: BillingSource,
    principal: PrincipalFilter,
    range: DateRange,
  ) => Promise<TRow[]>,
  renderers: {
    table: (meta: ReportMeta, rows: TRow[]) => string;
    csv: (meta: ReportMeta, rows: TRow[]) => string;
  },
): Promise<string> {
  const billing = await ctx.createBillingSource();
  const principal = await resolvePrincipalForBilling(ctx, billing);

  const rows = await fetchRows(billing, principal, range);
  const freshness =
    billing.peekBillingFreshness?.() ?? (await billing.fetchBillingFreshness(principal, range));

  const meta = buildReportMeta(ctx, principal, range, freshness);
  const envelope = { meta, rows };

  switch (ctx.outputFormat) {
    case "json":
      return renderJson(envelope);
    case "csv":
      return renderers.csv(meta, rows);
    default:
      return renderers.table(meta, rows);
  }
}
