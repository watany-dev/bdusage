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
import type { DateRange } from "../../util/dates.js";
import type { CurBillingSource } from "../billing-source.js";
import {
  athenaRowsToRawWithoutLatest,
  type BillingFreshness,
  parseBillingFreshnessFromRows,
} from "../cur/freshness.js";
import {
  athenaRowsToRaw,
  mapRawDailyRows,
  mapRawModelRows,
  mapRawMonthlyRows,
  mapRawUserRows,
  mapRawWeeklyRows,
} from "../cur-athena/aggregate.js";
import type { DuckDbExecutor } from "./duckdb.js";
import {
  billingFreshnessQuery,
  dailyQuery,
  modelsQuery,
  monthlyQuery,
  usersByPrincipalQuery,
  weeklyQuery,
} from "./queries.js";

export class CurDuckDbSource implements CurBillingSource {
  readonly resolved = "cur" as const;
  readonly curEngine = "duckdb" as const;

  private lastFreshness: BillingFreshness | null = null;

  constructor(
    private readonly executor: DuckDbExecutor,
    private readonly config: BdusageConfig,
  ) {}

  peekBillingFreshness(): BillingFreshness | null {
    return this.lastFreshness;
  }

  async fetchDaily(principal: PrincipalFilter, range: DateRange): Promise<DailyRow[]> {
    return this.fetchMapped(dailyQuery(this.config, principal, range), mapRawDailyRows);
  }

  async fetchWeekly(principal: PrincipalFilter, range: DateRange): Promise<WeeklyRow[]> {
    return this.fetchMapped(weeklyQuery(this.config, principal, range), mapRawWeeklyRows);
  }

  async fetchMonthly(principal: PrincipalFilter, range: DateRange): Promise<MonthlyRow[]> {
    return this.fetchMapped(monthlyQuery(this.config, principal, range), mapRawMonthlyRows);
  }

  async fetchUsers(range: DateRange): Promise<UserRow[]> {
    return this.fetchMapped(usersByPrincipalQuery(this.config, range), mapRawUserRows);
  }

  async fetchModels(principal: PrincipalFilter, range: DateRange): Promise<ModelRow[]> {
    return this.fetchMapped(modelsQuery(this.config, principal, range), mapRawModelRows);
  }

  async fetchBillingFreshness(
    principal: PrincipalFilter,
    range?: DateRange,
  ): Promise<{
    status: BillingDataStatus;
    latest: string | null;
  }> {
    if (this.lastFreshness && !range) {
      return this.lastFreshness;
    }
    if (!range) {
      return { status: "unknown", latest: null };
    }
    const rows = await this.executor.executeQuery(
      billingFreshnessQuery(this.config, principal, range),
    );
    return parseBillingFreshnessFromRows(rows);
  }

  async dispose(): Promise<void> {
    await this.executor.close();
  }

  private async fetchMapped<TRow>(
    sql: string,
    mapFn: (raw: ReturnType<typeof athenaRowsToRaw>) => TRow[],
  ): Promise<TRow[]> {
    const rows = await this.executor.executeQuery(sql);
    this.lastFreshness = parseBillingFreshnessFromRows(rows);
    return mapFn(athenaRowsToRaw(athenaRowsToRawWithoutLatest(rows)));
  }
}
