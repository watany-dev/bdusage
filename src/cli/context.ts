import type { AthenaExecutor } from "../aws/athena.js";
import { createAthenaClient, LiveAthenaExecutor } from "../aws/athena.js";
import { createCostExplorerClient, LiveCostExplorerClient } from "../aws/cost-explorer.js";
import { getCallerIdentity } from "../aws/sts.js";
import { ConfigError, loadConfigFile } from "../config/load.js";
import { defaultConfigPath } from "../config/paths.js";
import type { BdusageConfig } from "../config/schema.js";
import type { BillingSource } from "../sources/billing-source.js";
import { CeSource } from "../sources/ce/source.js";
import { CurSource } from "../sources/cur/source.js";
import { resolveBillingSource } from "../sources/resolve.js";
import type { PrincipalFilter } from "../types/principal.js";
import { assertCurPrincipalFilter, parsePrincipalTag } from "../types/principal.js";
import type { OutputFormat } from "../types/report.js";
import type { ResolvedSourceName, SourceName } from "../types/source.js";
import { isSourceName } from "../types/source.js";
import { VERSION } from "../version.js";

export interface GlobalOptions {
  profile?: string | undefined;
  region?: string | undefined;
  source: SourceName;
  principalArn?: string | undefined;
  principalRole?: string | undefined;
  principalTag?: string | undefined;
  principalFromProfile?: string | undefined;
  allPrincipals?: boolean | undefined;
  since?: string | undefined;
  until?: string | undefined;
  json?: boolean | undefined;
  csv?: boolean | undefined;
  configPath?: string | undefined;
}

export interface CommandContext {
  config: BdusageConfig;
  configPath: string;
  options: GlobalOptions;
  outputFormat: OutputFormat;
  version: string;
  resolvedSource?: ResolvedSourceName;
  createCurSource(): CurSource;
  createBillingSource(): Promise<BillingSource>;
  resolvePrincipal(): Promise<PrincipalFilter>;
}

export async function buildCommandContext(options: GlobalOptions): Promise<CommandContext> {
  const configPath = options.configPath ?? defaultConfigPath();
  const fileConfig = await loadConfigFile(configPath);
  const profile =
    options.profile ?? fileConfig.aws.profile ?? process.env["AWS_PROFILE"] ?? "default";
  const region =
    options.region ??
    fileConfig.aws.region ??
    process.env["AWS_REGION"] ??
    process.env["AWS_DEFAULT_REGION"] ??
    "us-east-1";

  const config: BdusageConfig = {
    ...fileConfig,
    aws: { profile, region },
  };

  const source = options.source;
  if (!isSourceName(source)) {
    throw new Error(`Unsupported source: ${source}`);
  }

  let outputFormat: OutputFormat = config.output.default_format;
  if (options.json) {
    outputFormat = "json";
  } else if (options.csv) {
    outputFormat = "csv";
  }

  const ctx: CommandContext = {
    config,
    configPath,
    options: { ...options, source },
    outputFormat,
    version: `bdusage v${VERSION}`,
    createCurSource() {
      const client = createAthenaClient(region, profile);
      const executor: AthenaExecutor = new LiveAthenaExecutor(client);
      return new CurSource(executor, config);
    },
    async createBillingSource() {
      const client = createAthenaClient(region, profile);
      const executor: AthenaExecutor = new LiveAthenaExecutor(client);
      const cur = new CurSource(executor, config);
      const ce = new CeSource(
        new LiveCostExplorerClient(createCostExplorerClient(region, profile)),
        config,
      );
      const billing = await resolveBillingSource(
        source,
        () => cur,
        () => ce,
        config,
        executor,
      );
      ctx.resolvedSource = billing.resolved;
      return billing;
    },
    async resolvePrincipal() {
      if (options.principalTag) {
        const tag = parsePrincipalTag(options.principalTag);
        return { kind: "tag", key: tag.key, value: tag.value };
      }
      if (options.allPrincipals) {
        return { kind: "all" };
      }
      if (options.principalRole) {
        return { kind: "role", roleArn: options.principalRole };
      }
      if (options.principalArn) {
        return { kind: "arn", arn: options.principalArn };
      }
      const identityProfile = options.principalFromProfile ?? profile;
      const identity = await getCallerIdentity(region, identityProfile);
      return { kind: "self", arn: identity.arn };
    },
  };

  return ctx;
}

export async function resolvePrincipalForBilling(
  ctx: CommandContext,
  billing: BillingSource,
): Promise<PrincipalFilter> {
  const principal = await ctx.resolvePrincipal();
  if (billing.resolved === "cur") {
    assertCurPrincipalFilter(principal);
  }
  return principal;
}

export function mapCliError(error: unknown): { message: string; exitCode: number } {
  if (error instanceof ConfigError) {
    return { message: error.message, exitCode: 1 };
  }
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes("Credentials") || msg.includes("credentials")) {
      return {
        message: "AWS credentials not found. Run aws configure or set AWS_PROFILE.",
        exitCode: 1,
      };
    }
    if (msg.includes("line_item_iam_principal")) {
      return {
        message: `${msg} See bdusage doctor.`,
        exitCode: 1,
      };
    }
    if (msg.includes("AccessDenied") || msg.includes("not authorized")) {
      return {
        message: `Access denied: ${msg}. Check IAM permissions (see docs/SPEC.md §15).`,
        exitCode: 1,
      };
    }
    if (msg.includes("Athena")) {
      return {
        message: `Athena query failed: ${msg}. Run bdusage doctor.`,
        exitCode: 1,
      };
    }
    if (msg.includes("Cost Explorer") || msg.includes("principal-tag")) {
      return { message: msg, exitCode: 1 };
    }
    return { message: msg, exitCode: 1 };
  }
  return { message: String(error), exitCode: 1 };
}
