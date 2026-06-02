import type { CommandContext } from "../cli/context.js";
import { renderDailyCsv } from "../output/csv.js";
import { renderDailyTable } from "../output/table.js";
import { billingRangeWithFallbackDays } from "../util/dates.js";
import { runBillingReport } from "./billing-report.js";

export async function runDaily(ctx: CommandContext): Promise<string> {
  const range = billingRangeWithFallbackDays(ctx.options.since, ctx.options.until, 30);
  return runBillingReport(ctx, range, (billing, principal, r) => billing.fetchDaily(principal, r), {
    table: renderDailyTable,
    csv: renderDailyCsv,
  });
}
