import type { CommandContext } from "../cli/context.js";
import { renderModelsCsv } from "../output/csv.js";
import { renderModelsTable } from "../output/table.js";
import { billingRangeFromMonthStart } from "../util/dates.js";
import { runBillingReport } from "./billing-report.js";

export async function runModels(ctx: CommandContext): Promise<string> {
  const range = billingRangeFromMonthStart(ctx.options.since, ctx.options.until, 30);
  return runBillingReport(
    ctx,
    range,
    (billing, principal, r) => billing.fetchModels(principal, r),
    { table: renderModelsTable, csv: renderModelsCsv },
  );
}
