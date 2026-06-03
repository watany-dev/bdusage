import type { CommandContext } from "../cli/context.js";
import { renderTodayJson } from "../output/json.js";
import { renderTodayTable } from "../output/table.js";
import { addDays, todayUtc } from "../util/dates.js";
import { buildEstimateReportMeta } from "./report-meta.js";

export async function runToday(ctx: CommandContext): Promise<string> {
  if (ctx.options.source !== "logs") {
    throw new Error(
      "today requires --source logs (CloudWatch Logs estimate). See docs/ROADMAP.md Step 3.",
    );
  }

  const estimate = await ctx.createEstimateSource();
  const principal = await ctx.resolvePrincipal();
  const day = todayUtc();
  const range = { since: day, until: addDays(day, 1) };
  const report = await estimate.fetchToday(principal, range);
  const meta = buildEstimateReportMeta(ctx, principal, range);

  switch (ctx.outputFormat) {
    case "json":
      return renderTodayJson(meta, report);
    case "csv":
      throw new Error("CSV output is not supported for today (use --json or table).");
    default:
      return renderTodayTable(meta, report);
  }
}
