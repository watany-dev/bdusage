import type { CostExplorerClientLike } from "../../aws/cost-explorer.js";
import { buildCeTimePeriod, ceMetricName, parseCeGroups } from "../../aws/cost-explorer.js";
import type { BdusageConfig } from "../../config/schema.js";
import type { PrincipalFilter } from "../../types/principal.js";
import type {
  BillingDataStatus,
  DailyRow,
  ModelRow,
  MonthlyRow,
  UserRow,
  WeeklyRow,
} from "../../types/report.js";
import { addDays, type DateRange, todayUtc } from "../../util/dates.js";
import type { BillingSource } from "../billing-source.js";
import {
  mapRawDailyRows,
  mapRawModelRows,
  mapRawMonthlyRows,
  mapRawRowsToWeekly,
} from "../cur-athena/aggregate.js";
import { buildCeFilter } from "./filters.js";

type CeGranularity = "DAILY" | "MONTHLY";
type CeDateKey = "usage_date" | "usage_month";

export class CeSource implements BillingSource {
  readonly resolved = "ce" as const;

  constructor(
    private readonly client: CostExplorerClientLike,
    private readonly config: BdusageConfig,
  ) {}

  async fetchDaily(principal: PrincipalFilter, range: DateRange): Promise<DailyRow[]> {
    const raw = await this.fetchGroupedUsage(principal, range, "DAILY", "usage_date");
    return mapRawDailyRows(raw);
  }

  async fetchWeekly(principal: PrincipalFilter, range: DateRange): Promise<WeeklyRow[]> {
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
    return mapRawRowsToWeekly(raw);
  }

  async fetchMonthly(principal: PrincipalFilter, range: DateRange): Promise<MonthlyRow[]> {
    const raw = await this.fetchGroupedUsage(principal, range, "MONTHLY", "usage_month");
    return mapRawMonthlyRows(raw);
  }

  async fetchUsers(_range: DateRange): Promise<UserRow[]> {
    throw new Error(
      "users requires --source cur (IAM principal ranking). Cost Explorer cannot group by IAM principal ARN.",
    );
  }

  async fetchModels(principal: PrincipalFilter, range: DateRange): Promise<ModelRow[]> {
    const raw = await this.fetchGroupedUsage(principal, range, "MONTHLY", "usage_month");
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
    const start = addDays(end, -1);
    await this.client.getCostAndUsage({
      TimePeriod: buildCeTimePeriod({ since: start, until: end }),
      Granularity: "MONTHLY",
      Metrics: [ceMetricName(this.config.cost.metric)],
      Filter: buildCeFilter({ kind: "all" }),
    });
  }

  private async fetchGroupedUsage(
    principal: PrincipalFilter,
    range: DateRange,
    granularity: CeGranularity,
    dateKey: CeDateKey,
  ) {
    const results = await this.client.getCostAndUsage({
      TimePeriod: buildCeTimePeriod(range),
      Granularity: granularity,
      Metrics: [ceMetricName(this.config.cost.metric), "UsageQuantity"],
      Filter: buildCeFilter(principal),
      GroupBy: [{ Type: "DIMENSION", Key: "USAGE_TYPE" }],
    });
    return parseCeGroups(results, {
      dateKey,
      metric: this.config.cost.metric,
    });
  }
}
