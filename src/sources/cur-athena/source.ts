import type { AthenaExecutor } from "../../aws/athena.js";
import type { BdusageConfig } from "../../config/schema.js";
import type { ResolvedCurEngine } from "../../types/engine.js";
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
} from "./aggregate.js";
import {
  billingFreshnessQuery,
  dailyQuery,
  modelsQuery,
  monthlyQuery,
  usersByPrincipalQuery,
  weeklyQuery,
} from "./queries.js";

export class CurAthenaSource implements CurBillingSource {
  readonly resolved = "cur" as const;
  readonly curEngine: ResolvedCurEngine = "athena";

  private lastFreshness: BillingFreshness | null = null;

  constructor(
    private readonly executor: AthenaExecutor,
    private readonly config: BdusageConfig,
  ) {}

  peekBillingFreshness(): BillingFreshness | null {
    return this.lastFreshness;
  }

  async fetchDaily(principal: PrincipalFilter, range: DateRange): Promise<DailyRow[]> {
    const sql = dailyQuery(this.config, principal, range);
    return this.fetchMapped(sql, mapRawDailyRows);
  }

  async fetchWeekly(principal: PrincipalFilter, range: DateRange): Promise<WeeklyRow[]> {
    const sql = weeklyQuery(this.config, principal, range);
    return this.fetchMapped(sql, mapRawWeeklyRows);
  }

  async fetchMonthly(principal: PrincipalFilter, range: DateRange): Promise<MonthlyRow[]> {
    const sql = monthlyQuery(this.config, principal, range);
    return this.fetchMapped(sql, mapRawMonthlyRows);
  }

  async fetchUsers(range: DateRange): Promise<UserRow[]> {
    const sql = usersByPrincipalQuery(this.config, range);
    return this.fetchMapped(sql, mapRawUserRows);
  }

  async fetchModels(principal: PrincipalFilter, range: DateRange): Promise<ModelRow[]> {
    const sql = modelsQuery(this.config, principal, range);
    return this.fetchMapped(sql, mapRawModelRows);
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
    const sql = billingFreshnessQuery(this.config, principal, range);
    const rows = await this.run(sql);
    return parseBillingFreshnessFromRows(rows);
  }

  private async fetchMapped<TRow>(
    sql: string,
    mapFn: (raw: ReturnType<typeof athenaRowsToRaw>) => TRow[],
  ): Promise<TRow[]> {
    const rows = await this.run(sql);
    this.lastFreshness = parseBillingFreshnessFromRows(rows);
    return mapFn(athenaRowsToRaw(athenaRowsToRawWithoutLatest(rows)));
  }

  private async run(sql: string): Promise<Array<Record<string, string | null>>> {
    const { database, workgroup, output_location } = this.config.cur.athena;
    if (!output_location) {
      throw new Error("cur.athena.output_location is not set in config. Run bdusage doctor.");
    }
    return this.executor.executeQuery({
      sql,
      database,
      workgroup,
      outputLocation: output_location,
    });
  }
}
