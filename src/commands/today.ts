import { type CommandContext, resolvePrincipalForEstimate } from "../cli/context.js";
import { renderTodayJson } from "../output/json.js";
import { renderTodayTable } from "../output/table.js";
import { todayUtc } from "../util/dates.js";
import { buildEstimateReportMeta } from "./report-meta.js";

export async function runToday(ctx: CommandContext): Promise<string> {
  if (ctx.options.source !== "logs") {
    throw new Error(
      "today requires --source logs (CloudWatch Logs estimate). See docs/ROADMAP.md v0.3.",
    );
  }

  const estimate = await ctx.createEstimateSource();
  const principal = await resolvePrincipalForEstimate(ctx);
  const day = todayUtc();
  const range = { since: day, until: addDaysUtc(day, 1) };
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

function addDaysUtc(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
