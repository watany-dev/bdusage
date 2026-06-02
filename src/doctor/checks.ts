import type { AthenaExecutor } from "../aws/athena.js";
import { createCostExplorerClient, LiveCostExplorerClient } from "../aws/cost-explorer.js";
import { getCallerIdentity } from "../aws/sts.js";
import type { BdusageConfig } from "../config/schema.js";
import { buildCeFilter } from "../sources/ce/filters.js";
import { iamPrincipalColumnCheckQuery, sampleBedrockQuery } from "../sources/cur/queries.js";
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

  if (!config.athena.output_location) {
    checks.push({
      name: "athena_output_location",
      status: "fail",
      message: "athena.output_location is empty",
      fix: "Set athena.output_location in config.toml (S3 path for query results).",
    });
  } else {
    checks.push({
      name: "athena_output_location",
      status: "ok",
      message: config.athena.output_location,
    });
  }

  if (!executor) {
    checks.push({
      name: "athena_query",
      status: "warn",
      message: "Skipped live Athena checks (no executor)",
    });
  } else {
    const { database, workgroup, output_location } = config.athena;
    if (!output_location) {
      checks.push({
        name: "athena_query",
        status: "warn",
        message: "Skipped live Athena checks (output_location not set)",
      });
    } else {
      const baseInput = {
        database,
        workgroup,
        outputLocation: output_location,
      };

      try {
        await executor.executeQuery({
          ...baseInput,
          sql: sampleBedrockQuery(config),
        });
        checks.push({
          name: "sample_bedrock_query",
          status: "ok",
          message: "Bedrock usage rows reachable",
        });
      } catch (error) {
        checks.push({
          name: "sample_bedrock_query",
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
            name: "cur_iam_principal_column",
            status: "fail",
            message: "line_item_iam_principal column not found or always NULL",
            fix: IAM_PRINCIPAL_FIX,
          });
        } else {
          checks.push({
            name: "cur_iam_principal_column",
            status: "ok",
            message: "IAM principal data present in CUR",
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("line_item_iam_principal")) {
          checks.push({
            name: "cur_iam_principal_column",
            status: "fail",
            message: "line_item_iam_principal column not found or always NULL",
            fix: IAM_PRINCIPAL_FIX,
          });
        } else {
          checks.push({
            name: "cur_iam_principal_column",
            status: "fail",
            message,
            fix: IAM_PRINCIPAL_FIX,
          });
        }
      }
    }
  }

  const region = config.aws.region ?? "us-east-1";
  const profile = config.aws.profile;
  await appendCeChecks(checks, region, profile);

  return checks;
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

export function overallStatus(checks: DoctorCheck[]): "ok" | "fail" {
  return checks.some((c) => c.status === "fail") ? "fail" : "ok";
}
