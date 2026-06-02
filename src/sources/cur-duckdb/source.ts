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
import type { CurBillingSource } from "../billing-source.js";
import {
  athenaRowsToRaw,
  mapRawDailyRows,
  mapRawModelRows,
  mapRawMonthlyRows,
  mapRawUserRows,
  mapRawWeeklyRows,
} from "../cur-athena/aggregate.js";
import type { DateRange } from "../cur-athena/queries.js";
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

  constructor(
    private readonly executor: DuckDbExecutor,
    private readonly config: BdusageConfig,
  ) {}

  async fetchDaily(principal: PrincipalFilter, range: DateRange): Promise<DailyRow[]> {
    const rows = await this.executor.executeQuery(dailyQuery(this.config, principal, range));
    return mapRawDailyRows(athenaRowsToRaw(rows));
  }

  async fetchWeekly(principal: PrincipalFilter, range: DateRange): Promise<WeeklyRow[]> {
    const rows = await this.executor.executeQuery(weeklyQuery(this.config, principal, range));
    return mapRawWeeklyRows(athenaRowsToRaw(rows));
  }

  async fetchMonthly(principal: PrincipalFilter, range: DateRange): Promise<MonthlyRow[]> {
    const rows = await this.executor.executeQuery(monthlyQuery(this.config, principal, range));
    return mapRawMonthlyRows(athenaRowsToRaw(rows));
  }

  async fetchUsers(range: DateRange): Promise<UserRow[]> {
    const rows = await this.executor.executeQuery(usersByPrincipalQuery(this.config, range));
    return mapRawUserRows(athenaRowsToRaw(rows));
  }

  async fetchModels(principal: PrincipalFilter, range: DateRange): Promise<ModelRow[]> {
    const rows = await this.executor.executeQuery(modelsQuery(this.config, principal, range));
    return mapRawModelRows(athenaRowsToRaw(rows));
  }

  async fetchBillingFreshness(principal: PrincipalFilter): Promise<{
    status: BillingDataStatus;
    latest: string | null;
  }> {
    const rows = await this.executor.executeQuery(billingFreshnessQuery(this.config, principal));
    const latest = rows[0]?.["latest_usage"] ?? null;
    if (!latest) {
      return { status: "unknown", latest: null };
    }
    return { status: "partial", latest };
  }
}
