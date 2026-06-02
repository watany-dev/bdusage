import type { AthenaExecutor } from "../../aws/athena.js";
import type { BdusageConfig } from "../../config/schema.js";
import type { PrincipalFilter } from "../../types/principal.js";
import type { BillingDataStatus, DailyRow, ModelRow, MonthlyRow } from "../../types/report.js";
import {
  athenaRowsToRaw,
  mapRawDailyRows,
  mapRawModelRows,
  mapRawMonthlyRows,
} from "./aggregate.js";
import {
  billingFreshnessQuery,
  type DateRange,
  dailyQuery,
  modelsQuery,
  monthlyQuery,
} from "./queries.js";

export class CurSource {
  constructor(
    private readonly executor: AthenaExecutor,
    private readonly config: BdusageConfig,
  ) {}

  async fetchDaily(principal: PrincipalFilter, range: DateRange): Promise<DailyRow[]> {
    const sql = dailyQuery(this.config, principal, range);
    const rows = await this.run(sql);
    return mapRawDailyRows(athenaRowsToRaw(rows));
  }

  async fetchMonthly(principal: PrincipalFilter, range: DateRange): Promise<MonthlyRow[]> {
    const sql = monthlyQuery(this.config, principal, range);
    const rows = await this.run(sql);
    return mapRawMonthlyRows(athenaRowsToRaw(rows));
  }

  async fetchModels(principal: PrincipalFilter, range: DateRange): Promise<ModelRow[]> {
    const sql = modelsQuery(this.config, principal, range);
    const rows = await this.run(sql);
    return mapRawModelRows(athenaRowsToRaw(rows));
  }

  async fetchBillingFreshness(principal: PrincipalFilter): Promise<{
    status: BillingDataStatus;
    latest: string | null;
  }> {
    const sql = billingFreshnessQuery(this.config, principal);
    const rows = await this.run(sql);
    const latest = rows[0]?.["latest_usage"] ?? null;
    if (!latest) {
      return { status: "unknown", latest: null };
    }
    return { status: "partial", latest };
  }

  private async run(sql: string): Promise<Array<Record<string, string | null>>> {
    const { database, workgroup, output_location } = this.config.athena;
    if (!output_location) {
      throw new Error("athena.output_location is not set in config. Run bdusage doctor.");
    }
    return this.executor.executeQuery({
      sql,
      database,
      workgroup,
      outputLocation: output_location,
    });
  }
}
