import {
  CloudWatchLogsClient,
  GetQueryResultsCommand,
  type ResultField,
  StartQueryCommand,
} from "@aws-sdk/client-cloudwatch-logs";

export interface LogInsightsRow {
  [field: string]: string | undefined;
}

export interface CloudWatchLogsClientLike {
  runInsightsQuery(input: {
    logGroupName: string;
    queryString: string;
    startTime: number;
    endTime: number;
  }): Promise<LogInsightsRow[]>;
}

export function createCloudWatchLogsClient(region: string, profile?: string): CloudWatchLogsClient {
  return new CloudWatchLogsClient({
    region,
    ...(profile ? { profile } : {}),
  });
}

export class LiveCloudWatchLogsClient implements CloudWatchLogsClientLike {
  constructor(private readonly client: CloudWatchLogsClient) {}

  async runInsightsQuery(input: {
    logGroupName: string;
    queryString: string;
    startTime: number;
    endTime: number;
  }): Promise<LogInsightsRow[]> {
    const start = await this.client.send(
      new StartQueryCommand({
        logGroupName: input.logGroupName,
        queryString: input.queryString,
        startTime: input.startTime,
        endTime: input.endTime,
      }),
    );
    const queryId = start.queryId;
    if (!queryId) {
      throw new Error("CloudWatch Logs Insights did not return a query id");
    }

    for (let attempt = 0; attempt < 60; attempt++) {
      const result = await this.client.send(new GetQueryResultsCommand({ queryId }));
      const status = result.status;
      if (status === "Complete") {
        return parseInsightsResults(result.results ?? []);
      }
      if (status === "Failed" || status === "Cancelled") {
        throw new Error(`CloudWatch Logs Insights query ${status.toLowerCase()}`);
      }
      await sleep(500);
    }
    throw new Error("CloudWatch Logs Insights query timed out");
  }
}

function parseInsightsResults(results: ResultField[][]): LogInsightsRow[] {
  return results.map((row) => {
    const record: LogInsightsRow = {};
    for (const cell of row) {
      if (cell.field) {
        record[cell.field] = cell.value;
      }
    }
    return record;
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
