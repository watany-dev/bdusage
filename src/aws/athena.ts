import {
  AthenaClient,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
  type GetQueryResultsCommandOutput,
  StartQueryExecutionCommand,
} from "@aws-sdk/client-athena";

export interface AthenaQueryInput {
  sql: string;
  database: string;
  workgroup: string;
  outputLocation: string;
}

export interface AthenaRow {
  [column: string]: string | null;
}

export interface AthenaExecutor {
  executeQuery(input: AthenaQueryInput): Promise<AthenaRow[]>;
}

export class LiveAthenaExecutor implements AthenaExecutor {
  constructor(private readonly client: AthenaClient) {}

  async executeQuery(input: AthenaQueryInput): Promise<AthenaRow[]> {
    const start = await this.client.send(
      new StartQueryExecutionCommand({
        QueryString: input.sql,
        QueryExecutionContext: { Database: input.database },
        WorkGroup: input.workgroup,
        ResultConfiguration: { OutputLocation: input.outputLocation },
      }),
    );

    const queryId = start.QueryExecutionId;
    if (!queryId) {
      throw new Error("Athena did not return a query execution id");
    }

    await waitForQuery(this.client, queryId);

    const rows: AthenaRow[] = [];
    let nextToken: string | undefined;
    let header: string[] | undefined;

    do {
      const page: GetQueryResultsCommandOutput = await this.client.send(
        new GetQueryResultsCommand({
          QueryExecutionId: queryId,
          ...(nextToken ? { NextToken: nextToken } : {}),
        }),
      );

      const resultRows = page.ResultSet?.Rows ?? [];
      for (const row of resultRows) {
        const values = (row.Data ?? []).map((cell) => cell.VarCharValue ?? null);
        if (!header) {
          header = values.map((v, i) => v ?? `col_${i}`);
          continue;
        }
        const record: AthenaRow = {};
        for (let i = 0; i < header.length; i++) {
          const key = header[i];
          if (key) {
            record[key] = values[i] ?? null;
          }
        }
        rows.push(record);
      }
      nextToken = page.NextToken;
    } while (nextToken);

    return rows;
  }
}

async function waitForQuery(
  client: AthenaClient,
  queryId: string,
  maxAttempts = 120,
): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await client.send(new GetQueryExecutionCommand({ QueryExecutionId: queryId }));
    const state = status.QueryExecution?.Status?.State;
    if (state === "SUCCEEDED") {
      return;
    }
    if (state === "FAILED" || state === "CANCELLED") {
      const reason = status.QueryExecution?.Status?.StateChangeReason ?? "unknown";
      throw new Error(`Athena query ${state}: ${reason}`);
    }
    await sleep(500);
  }
  throw new Error("Athena query timed out");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createAthenaClient(region: string, profile?: string): AthenaClient {
  return new AthenaClient({
    region,
    ...(profile ? { profile } : {}),
  });
}
