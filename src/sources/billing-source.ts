import type { ResolvedCurEngine } from "../types/engine.js";
import type { PrincipalFilter } from "../types/principal.js";
import type {
  BillingDataStatus,
  DailyRow,
  ModelRow,
  MonthlyRow,
  UserRow,
  WeeklyRow,
} from "../types/report.js";
import type { ResolvedSourceName } from "../types/source.js";
import type { DateRange } from "../util/dates.js";
import type { BillingFreshness } from "./cur/freshness.js";

export interface BillingSource {
  readonly resolved: ResolvedSourceName;
  fetchDaily(principal: PrincipalFilter, range: DateRange): Promise<DailyRow[]>;
  fetchWeekly(principal: PrincipalFilter, range: DateRange): Promise<WeeklyRow[]>;
  fetchMonthly(principal: PrincipalFilter, range: DateRange): Promise<MonthlyRow[]>;
  fetchModels(principal: PrincipalFilter, range: DateRange): Promise<ModelRow[]>;
  fetchUsers(range: DateRange): Promise<UserRow[]>;
  fetchBillingFreshness(
    principal: PrincipalFilter,
    range?: DateRange,
  ): Promise<{
    status: BillingDataStatus;
    latest: string | null;
  }>;
  /** Freshness from the most recent ranged fetch (CUR sources only). */
  peekBillingFreshness?(): BillingFreshness | null;
  /** Release DuckDB sessions and similar resources. */
  dispose?(): Promise<void>;
}

export interface CurBillingSource extends BillingSource {
  readonly resolved: "cur";
  readonly curEngine: ResolvedCurEngine;
}
