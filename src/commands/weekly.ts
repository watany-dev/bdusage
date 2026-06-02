import type { CommandContext } from "../cli/context.js";
import { renderWeeklyCsv } from "../output/csv.js";
import { renderWeeklyTable } from "../output/table.js";
import { billingRangeWithFallbackDays } from "../util/dates.js";
import { runBillingReport } from "./billing-report.js";

export async function runWeekly(ctx: CommandContext): Promise<string> {
  const range = billingRangeWithFallbackDays(ctx.options.since, ctx.options.until, 90);
  return runBillingReport(
    ctx,
    range,
    (billing, principal, r) => billing.fetchWeekly(principal, r),
    { table: renderWeeklyTable, csv: renderWeeklyCsv },
  );
}
