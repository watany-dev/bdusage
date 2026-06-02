import type { PrincipalFilter } from "../types/principal.js";
import type { TodayReport } from "../types/report.js";
import type { ResolvedSourceName } from "../types/source.js";
import type { DateRange } from "../util/dates.js";

export interface EstimateSource {
  readonly resolved: ResolvedSourceName;
  fetchToday(principal: PrincipalFilter, range: DateRange): Promise<TodayReport>;
  probe(): Promise<void>;
}
