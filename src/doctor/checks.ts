import type { AthenaExecutor } from "../aws/athena.js";
import { createCloudWatchLogsClient, LiveCloudWatchLogsClient } from "../aws/cloudwatch-logs.js";
import { createCostExplorerClient, LiveCostExplorerClient } from "../aws/cost-explorer.js";
import { getCallerIdentity } from "../aws/sts.js";
import { hasDuckDbFiles } from "../config/load.js";
import type { BdusageConfig } from "../config/schema.js";
import { buildCeFilter } from "../sources/ce/filters.js";
import { iamPrincipalColumnCheckQuery, sampleBedrockQuery } from "../sources/cur-athena/queries.js";
import { createDuckDbExecutor, DuckDbUnavailableError } from "../sources/cur-duckdb/duckdb.js";
import {
  iamPrincipalColumnCheckQuery as duckdbIamPrincipalQuery,
  sampleBedrockQuery as duckdbSampleQuery,
} from "../sources/cur-duckdb/queries.js";
import { checkRequiredColumns } from "../sources/cur-duckdb/schema.js";
import { todayUtc } from "../util/dates.js";

type CheckStatus = "ok" | "fail" | "warn";

interface DoctorCheck {
  name: string;
  status: CheckStatus;
  message?: string;
  fix?: string;
}

const IAM_PRINCIPAL_FIX = `1. AWS Billing → Data Exports → your CUR 2.0 export
2. Enable "Include caller identity (IAM principal) allocation data"
3. Wait for new CUR files (data available from export change date)
4. Refresh Athena table schema if needed`;

export async function runDoctorChecks(
  config: BdusageConfig,
  configPath: string,
  executor: AthenaExecutor | null,
): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];

  try {
    const identity = await getCallerIdentity(config.aws.region ?? "us-east-1", config.aws.profile);
    checks.push({
      name: "aws_credentials",
      status: "ok",
      message: `account ${identity.account}, arn ${identity.arn}`,
    });
  } catch (error) {
    checks.push({
      name: "aws_credentials",
      status: "fail",
      message: error instanceof Error ? error.message : String(error),
      fix: "Run aws configure or set AWS_PROFILE.",
    });
  }

  checks.push({
    name: "config_file",
    status: "ok",
    message: configPath,
  });

  await appendDuckDbChecks(checks, config);
  await appendAthenaChecks(checks, config, executor);

  const region = config.aws.region ?? "us-east-1";
  const profile = config.aws.profile;
  await appendCeChecks(checks, region, profile);
  await appendLogsChecks(checks, config, region, profile);

  return checks;
}

async function appendDuckDbChecks(checks: DoctorCheck[], config: BdusageConfig): Promise<void> {
  if (!hasDuckDbFiles(config)) {
    checks.push({
      name: "duckdb_files",
      status: "warn",
      message: "cur.duckdb.files is not set",
      fix: `Add to config.toml:
[cur.duckdb]
files = "s3://your-cur-bucket/export/**/*.parquet"
s3_region = "ap-northeast-1"`,
    });
    return;
  }

  checks.push({
    name: "duckdb_files",
    status: "ok",
    message: `${config.cur.duckdb.files.length} path(s): ${config.cur.duckdb.files.join(", ")}`,
  });

  let duckExecutor: Awaited<ReturnType<typeof createDuckDbExecutor>> | null = null;
  try {
    duckExecutor = await createDuckDbExecutor(config);
    checks.push({
      name: "duckdb_httpfs",
      status: "ok",
      message: "httpfs extension loaded",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof DuckDbUnavailableError && message.includes("httpfs")) {
      checks.push({
        name: "duckdb_httpfs",
        status: "fail",
        message,
        fix: "Ensure @duckdb/node-api is installed and DuckDB can load extensions.",
      });
    } else {
      checks.push({
        name: "duckdb_connect",
        status: "fail",
        message,
        fix: "Check cur.duckdb.files, AWS profile, and s3_region for the CUR export bucket.",
      });
    }
    return;
  }

  try {
    await duckExecutor.executeQuery(duckdbSampleQuery());
    checks.push({
      name: "duckdb_sample_bedrock_query",
      status: "ok",
      message: "Bedrock usage rows reachable via DuckDB",
    });
  } catch (error) {
    checks.push({
      name: "duckdb_sample_bedrock_query",
      status: "fail",
      message: error instanceof Error ? error.message : String(error),
      fix: "Verify cur.duckdb.files glob matches Parquet export paths.",
    });
  }

  try {
    const { ok, missing } = await checkRequiredColumns(duckExecutor, config);
    if (ok) {
      checks.push({
        name: "duckdb_required_columns",
        status: "ok",
        message: "Required CUR columns present",
      });
    } else {
      checks.push({
        name: "duckdb_required_columns",
        status: "fail",
        message: `Missing columns: ${missing.join(", ")}`,
        fix: "Ensure CUR 2.0 export includes standard line item columns.",
      });
    }
  } catch (error) {
    checks.push({
      name: "duckdb_required_columns",
      status: "fail",
      message: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const rows = await duckExecutor.executeQuery(duckdbIamPrincipalQuery());
    if (rows.length === 0) {
      checks.push({
        name: "duckdb_iam_principal_column",
        status: "fail",
        message: "line_item_iam_principal column not found or always NULL",
        fix: IAM_PRINCIPAL_FIX,
      });
    } else {
      checks.push({
        name: "duckdb_iam_principal_column",
        status: "ok",
        message: "IAM principal data present in CUR",
      });
    }
  } catch (error) {
    checks.push({
      name: "duckdb_iam_principal_column",
      status: "fail",
      message: error instanceof Error ? error.message : String(error),
      fix: IAM_PRINCIPAL_FIX,
    });
  } finally {
    await duckExecutor.close();
  }
}

async function appendAthenaChecks(
  checks: DoctorCheck[],
  config: BdusageConfig,
  executor: AthenaExecutor | null,
): Promise<void> {
  const outputLocation = config.cur.athena.output_location;
  if (!outputLocation) {
    checks.push({
      name: "athena_output_location",
      status: "warn",
      message: "cur.athena.output_location is empty (Athena backend skipped)",
      fix: "Set cur.athena.output_location for Athena CUR queries.",
    });
    if (!hasDuckDbFiles(config)) {
      checks.push({
        name: "athena_query",
        status: "warn",
        message: "Skipped live Athena checks (no Athena config and no DuckDB files)",
      });
    }
    return;
  }

  checks.push({
    name: "athena_output_location",
    status: "ok",
    message: outputLocation,
  });

  if (!executor) {
    checks.push({
      name: "athena_query",
      status: "warn",
      message: "Skipped live Athena checks (no executor)",
    });
    return;
  }

  const { database, workgroup } = config.cur.athena;
  const baseInput = {
    database,
    workgroup,
    outputLocation,
  };

  try {
    await executor.executeQuery({
      ...baseInput,
      sql: sampleBedrockQuery(config),
    });
    checks.push({
      name: "athena_sample_bedrock_query",
      status: "ok",
      message: "Bedrock usage rows reachable via Athena",
    });
  } catch (error) {
    checks.push({
      name: "athena_sample_bedrock_query",
      status: "fail",
      message: error instanceof Error ? error.message : String(error),
      fix: "Verify Athena database/table and IAM permissions (SPEC §15).",
    });
  }

  try {
    const rows = await executor.executeQuery({
      ...baseInput,
      sql: iamPrincipalColumnCheckQuery(config),
    });
    if (rows.length === 0) {
      checks.push({
        name: "athena_iam_principal_column",
        status: "fail",
        message: "line_item_iam_principal column not found or always NULL",
        fix: IAM_PRINCIPAL_FIX,
      });
    } else {
      checks.push({
        name: "athena_iam_principal_column",
        status: "ok",
        message: "IAM principal data present in CUR",
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push({
      name: "athena_iam_principal_column",
      status: "fail",
      message: message.includes("line_item_iam_principal")
        ? "line_item_iam_principal column not found or always NULL"
        : message,
      fix: IAM_PRINCIPAL_FIX,
    });
  }
}

async function appendCeChecks(
  checks: DoctorCheck[],
  region: string,
  profile?: string,
): Promise<void> {
  const client = new LiveCostExplorerClient(createCostExplorerClient(region, profile));
  const end = todayUtc();
  const startDate = new Date(`${end}T00:00:00Z`);
  startDate.setUTCDate(startDate.getUTCDate() - 7);
  const start = startDate.toISOString().slice(0, 10);
  const timePeriod = { Start: start, End: end };

  try {
    await client.getCostAndUsage({
      TimePeriod: timePeriod,
      Granularity: "MONTHLY",
      Metrics: ["UnblendedCost"],
      Filter: buildCeFilter({ kind: "all" }),
    });
    checks.push({
      name: "ce_bedrock_access",
      status: "ok",
      message: "Cost Explorer can read Amazon Bedrock costs",
    });
  } catch (error) {
    checks.push({
      name: "ce_bedrock_access",
      status: "warn",
      message: error instanceof Error ? error.message : String(error),
      fix: "Grant ce:GetCostAndUsage for Cost Explorer fallback (SPEC §15).",
    });
  }

  checks.push({
    name: "ce_principal_tag",
    status: "ok",
    message:
      "Use --principal-tag <key=value> with --source ce to filter by cost allocation tag. IAM principal ARN filtering requires CUR (--source cur).",
  });
}

async function appendLogsChecks(
  checks: DoctorCheck[],
  config: BdusageConfig,
  region: string,
  profile?: string,
): Promise<void> {
  const logGroup = config.logs.log_group;
  if (!logGroup) {
    checks.push({
      name: "logs_log_group",
      status: "warn",
      message: "logs.log_group is not set",
      fix: `Add to config.toml:
[logs]
log_group = "/aws/bedrock/modelinvocations"`,
    });
    return;
  }

  checks.push({
    name: "logs_log_group",
    status: "ok",
    message: logGroup,
  });

  const logsRegion = config.logs.region ?? region;
  const client = new LiveCloudWatchLogsClient(createCloudWatchLogsClient(logsRegion, profile));
  try {
    const now = Math.floor(Date.now() / 1000);
    await client.runInsightsQuery({
      logGroupName: logGroup,
      queryString: 'fields @timestamp | filter schemaType = "ModelInvocationLog" | limit 1',
      startTime: now - 86_400,
      endTime: now,
    });
    checks.push({
      name: "logs_insights_query",
      status: "ok",
      message: "CloudWatch Logs Insights can query Bedrock invocation logs",
    });
  } catch (error) {
    checks.push({
      name: "logs_insights_query",
      status: "warn",
      message: error instanceof Error ? error.message : String(error),
      fix: "Enable Bedrock model invocation logging to CloudWatch Logs (SPEC §7.3). Grant logs:StartQuery, logs:GetQueryResults.",
    });
  }

  checks.push({
    name: "logs_principal_filter",
    status: "ok",
    message:
      "Use --principal self|arn|role with --source logs. identity.arn is filtered in Insights queries; body fields are never queried.",
  });
}

export function overallStatus(checks: DoctorCheck[]): "ok" | "fail" {
  return checks.some((c) => c.status === "fail") ? "fail" : "ok";
}
