import { classifyUsageType } from "../bedrock/token-types.js";
import { type CommandContext, resolvePrincipalForBilling } from "../cli/context.js";
import { renderJson } from "../output/json.js";
import { renderSummaryTable } from "../output/table.js";
import { monthStart, parseUntil, todayUtc } from "../util/dates.js";
import { buildReportMeta } from "./report-meta.js";

function yesterdayUtc(): string {
  const d = new Date(`${todayUtc()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function runSummary(ctx: CommandContext): Promise<string> {
  const billing = await ctx.createBillingSource();
  const principal = await resolvePrincipalForBilling(ctx, billing);
  const monthSince = monthStart(todayUtc());
  const until = parseUntil(ctx.options.until);
  const monthRange = { since: monthSince, until };
  const yesterday = yesterdayUtc();
  const dayRange = {
    since: yesterday,
    until: parseUntil(undefined),
  };

  const [monthlyRows, dailyRows, freshness] = await Promise.all([
    billing.fetchMonthly(principal, monthRange),
    billing.fetchDaily(principal, dayRange),
    billing.fetchBillingFreshness(principal),
  ]);

  const thisMonth = monthlyRows.reduce((sum, row) => sum + row.cost, 0);
  const yesterdayRow = dailyRows.find((row) => row.date === yesterday);
  const yesterdayCost = yesterdayRow?.cost ?? 0;

  let topModel: string | null = null;
  let topModelCost = -1;
  for (const row of monthlyRows) {
    if (row.top_model && row.cost > topModelCost) {
      topModelCost = row.cost;
      topModel = row.top_model;
    }
  }

  const modelRows = await billing.fetchModels(principal, monthRange);
  const driverCosts = new Map<string, number>();
  for (const row of modelRows) {
    for (const usageType of row.usage_types) {
      const kind = classifyUsageType(usageType);
      if (kind === "other") {
        continue;
      }
      const key = `${kind} tokens`;
      driverCosts.set(key, (driverCosts.get(key) ?? 0) + row.cost / row.usage_types.length);
    }
  }
  let topDriver: string | null = null;
  let topDriverCost = -1;
  for (const [driver, cost] of driverCosts) {
    if (cost > topDriverCost) {
      topDriverCost = cost;
      topDriver = driver;
    }
  }

  const meta = buildReportMeta(ctx, principal, monthRange, freshness);
  const totals = {
    this_month: thisMonth,
    yesterday: yesterdayCost,
    top_model: topModel,
    top_driver: topDriver,
  };

  if (ctx.outputFormat === "json") {
    return renderJson({ meta, rows: [], totals });
  }

  return renderSummaryTable(meta, totals);
}
