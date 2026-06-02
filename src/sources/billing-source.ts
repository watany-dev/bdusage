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

export interface BillingSource {
  readonly resolved: ResolvedSourceName;
  fetchDaily(principal: PrincipalFilter, range: DateRange): Promise<DailyRow[]>;
  fetchWeekly(principal: PrincipalFilter, range: DateRange): Promise<WeeklyRow[]>;
  fetchMonthly(principal: PrincipalFilter, range: DateRange): Promise<MonthlyRow[]>;
  fetchModels(principal: PrincipalFilter, range: DateRange): Promise<ModelRow[]>;
  fetchUsers(range: DateRange): Promise<UserRow[]>;
  fetchBillingFreshness(principal: PrincipalFilter): Promise<{
    status: BillingDataStatus;
    latest: string | null;
  }>;
}

export interface CurBillingSource extends BillingSource {
  readonly resolved: "cur";
  readonly curEngine: ResolvedCurEngine;
}
