import type { CostExplorerClientLike } from "../../aws/cost-explorer.js";
import { buildCeTimePeriod, ceMetricName, parseCeGroups } from "../../aws/cost-explorer.js";
import type { BdusageConfig } from "../../config/schema.js";
import type { PrincipalFilter } from "../../types/principal.js";
import type { BillingDataStatus, DailyRow, ModelRow, MonthlyRow } from "../../types/report.js";
import { type DateRange, todayUtc } from "../../util/dates.js";
import type { BillingSource } from "../billing-source.js";
import { mapRawDailyRows, mapRawModelRows, mapRawMonthlyRows } from "../cur/aggregate.js";
import { buildCeFilter } from "./filters.js";

export class CeSource implements BillingSource {
  readonly resolved = "ce" as const;

  constructor(
    private readonly client: CostExplorerClientLike,
    private readonly config: BdusageConfig,
  ) {}

  async fetchDaily(principal: PrincipalFilter, range: DateRange): Promise<DailyRow[]> {
    const results = await this.client.getCostAndUsage({
      TimePeriod: buildCeTimePeriod(range),
      Granularity: "DAILY",
      Metrics: [ceMetricName(this.config.cost.metric), "UsageQuantity"],
      Filter: buildCeFilter(principal),
      GroupBy: [{ Type: "DIMENSION", Key: "USAGE_TYPE" }],
    });
    const raw = parseCeGroups(results, {
      dateKey: "usage_date",
      metric: this.config.cost.metric,
    });
    return mapRawDailyRows(raw);
  }

  async fetchMonthly(principal: PrincipalFilter, range: DateRange): Promise<MonthlyRow[]> {
    const results = await this.client.getCostAndUsage({
      TimePeriod: buildCeTimePeriod(range),
      Granularity: "MONTHLY",
      Metrics: [ceMetricName(this.config.cost.metric), "UsageQuantity"],
      Filter: buildCeFilter(principal),
      GroupBy: [{ Type: "DIMENSION", Key: "USAGE_TYPE" }],
    });
    const raw = parseCeGroups(results, {
      dateKey: "usage_month",
      metric: this.config.cost.metric,
    });
    return mapRawMonthlyRows(raw);
  }

  async fetchModels(principal: PrincipalFilter, range: DateRange): Promise<ModelRow[]> {
    const results = await this.client.getCostAndUsage({
      TimePeriod: buildCeTimePeriod(range),
      Granularity: "MONTHLY",
      Metrics: [ceMetricName(this.config.cost.metric), "UsageQuantity"],
      Filter: buildCeFilter(principal),
      GroupBy: [{ Type: "DIMENSION", Key: "USAGE_TYPE" }],
    });
    const raw = parseCeGroups(results, {
      dateKey: "usage_month",
      metric: this.config.cost.metric,
    });
    return mapRawModelRows(raw);
  }

  async fetchBillingFreshness(_principal: PrincipalFilter): Promise<{
    status: BillingDataStatus;
    latest: string | null;
  }> {
    return { status: "partial", latest: null };
  }

  async probe(): Promise<void> {
    const end = todayUtc();
    const startDate = new Date(`${end}T00:00:00Z`);
    startDate.setUTCDate(startDate.getUTCDate() - 1);
    const start = startDate.toISOString().slice(0, 10);
    await this.client.getCostAndUsage({
      TimePeriod: buildCeTimePeriod({ since: start, until: end }),
      Granularity: "MONTHLY",
      Metrics: [ceMetricName(this.config.cost.metric)],
      Filter: buildCeFilter({ kind: "all" }),
    });
  }
}
