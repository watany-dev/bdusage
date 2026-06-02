import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  type GetCostAndUsageCommandInput,
  type Group,
  type ResultByTime,
} from "@aws-sdk/client-cost-explorer";
import type { CostMetric } from "../types/report.js";
import type { DateRange } from "../util/dates.js";

interface CeUsageRow {
  usage_date?: string;
  usage_month?: string;
  usage_type: string;
  cost: number;
  usage_amount: number;
}

export interface CostExplorerClientLike {
  getCostAndUsage(input: GetCostAndUsageCommandInput): Promise<ResultByTime[]>;
}

export class LiveCostExplorerClient implements CostExplorerClientLike {
  constructor(private readonly client: CostExplorerClient) {}

  async getCostAndUsage(input: GetCostAndUsageCommandInput): Promise<ResultByTime[]> {
    const response = await this.client.send(new GetCostAndUsageCommand(input));
    return response.ResultsByTime ?? [];
  }
}

export function createCostExplorerClient(region: string, profile?: string): CostExplorerClient {
  return new CostExplorerClient({
    region,
    ...(profile ? { profile } : {}),
  });
}

export function ceMetricName(metric: CostMetric): "UnblendedCost" | "NetUnblendedCost" {
  return metric === "net_unblended" ? "NetUnblendedCost" : "UnblendedCost";
}

export function parseCeGroups(
  results: ResultByTime[],
  options: { dateKey: "usage_date" | "usage_month"; metric: CostMetric },
): CeUsageRow[] {
  const costKey = ceMetricName(options.metric);
  const rows: CeUsageRow[] = [];

  for (const period of results) {
    const dateValue = period.TimePeriod?.Start;
    if (!dateValue) {
      continue;
    }
    const groups = period.Groups ?? [];
    for (const group of groups) {
      rows.push(mapCeGroup(group, dateValue, options.dateKey, costKey));
    }
  }

  return rows;
}

function mapCeGroup(
  group: Group,
  dateValue: string,
  dateKey: "usage_date" | "usage_month",
  costKey: "UnblendedCost" | "NetUnblendedCost",
): CeUsageRow {
  const usageType = group.Keys?.[0] ?? "";
  const cost = parseAmount(group.Metrics?.[costKey]?.Amount);
  const usageAmount = parseAmount(group.Metrics?.["UsageQuantity"]?.Amount);
  const row: CeUsageRow = { usage_type: usageType, cost, usage_amount: usageAmount };
  if (dateKey === "usage_date") {
    row.usage_date = dateValue;
  } else {
    row.usage_month = dateValue.slice(0, 7);
  }
  return row;
}

function parseAmount(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function buildCeTimePeriod(range: DateRange): { Start: string; End: string } {
  return { Start: range.since, End: range.until };
}
