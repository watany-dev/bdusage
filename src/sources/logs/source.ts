import type { CloudWatchLogsClientLike } from "../../aws/cloudwatch-logs.js";
import { estimateCostFromRates, type PricingCatalogLike } from "../../aws/pricing.js";
import type { BdusageConfig } from "../../config/schema.js";
import type { PrincipalFilter } from "../../types/principal.js";
import type { TodayReport } from "../../types/report.js";
import type { DateRange } from "../../util/dates.js";
import type { EstimateSource } from "../estimate-source.js";
import { aggregateTodayReport, parseModelUsageRows } from "./aggregate.js";
import { buildTodayInsightsQuery } from "./queries.js";

export class LogsSource implements EstimateSource {
  readonly resolved = "logs" as const;

  constructor(
    private readonly logsClient: CloudWatchLogsClientLike,
    private readonly pricing: PricingCatalogLike,
    private readonly config: BdusageConfig,
  ) {}

  async probe(): Promise<void> {
    const logGroup = this.logGroupName();
    const now = Math.floor(Date.now() / 1000);
    await this.logsClient.runInsightsQuery({
      logGroupName: logGroup,
      queryString: 'fields @timestamp | filter schemaType = "ModelInvocationLog" | limit 1',
      startTime: now - 3600,
      endTime: now,
    });
  }

  async fetchToday(principal: PrincipalFilter, range: DateRange): Promise<TodayReport> {
    const logGroup = this.logGroupName();
    const region = this.config.logs.region ?? this.config.aws.region ?? "us-east-1";
    const startTime = Math.floor(new Date(`${range.since}T00:00:00Z`).getTime() / 1000);
    const endTime = Math.floor(new Date(`${range.until}T00:00:00Z`).getTime() / 1000);

    const rows = await this.logsClient.runInsightsQuery({
      logGroupName: logGroup,
      queryString: buildTodayInsightsQuery(principal),
      startTime,
      endTime,
    });

    const modelRows = parseModelUsageRows(rows);
    const estimatedCost = await this.estimateTotalCost(modelRows, region);
    return aggregateTodayReport(modelRows, estimatedCost);
  }

  private logGroupName(): string {
    const name = this.config.logs.log_group;
    if (!name) {
      throw new Error(
        "logs.log_group is not set in config.toml. Set the Bedrock invocation log group (see docs/SPEC.md §17).",
      );
    }
    return name;
  }

  private async estimateTotalCost(
    modelRows: ReturnType<typeof parseModelUsageRows>,
    region: string,
  ): Promise<number | null> {
    let total = 0;
    let priced = false;
    for (const row of modelRows) {
      const rates = await this.pricing.getModelRates(row.modelId, region);
      if (!rates) {
        continue;
      }
      priced = true;
      total += estimateCostFromRates(rates, row.tokens);
    }
    return priced ? total : null;
  }
}
