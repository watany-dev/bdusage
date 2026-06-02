import type { CommandContext } from "../cli/context.js";
import { renderMonthlyCsv } from "../output/csv.js";
import { renderMonthlyTable } from "../output/table.js";
import { billingRangeFromMonthStart } from "../util/dates.js";
import { runBillingReport } from "./billing-report.js";

export async function runMonthly(ctx: CommandContext): Promise<string> {
  const range = billingRangeFromMonthStart(ctx.options.since, ctx.options.until, 365);
  return runBillingReport(
    ctx,
    range,
    (billing, principal, r) => billing.fetchMonthly(principal, r),
    { table: renderMonthlyTable, csv: renderMonthlyCsv },
  );
}
