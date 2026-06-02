import type { AthenaExecutor } from "../aws/athena.js";
import { createAthenaClient, LiveAthenaExecutor } from "../aws/athena.js";
import { getCallerIdentity } from "../aws/sts.js";
import { ConfigError, loadConfigFile } from "../config/load.js";
import { defaultConfigPath } from "../config/paths.js";
import type { BdusageConfig } from "../config/schema.js";
import { CurSource } from "../sources/cur/source.js";
import type { PrincipalFilter } from "../types/principal.js";
import type { OutputFormat } from "../types/report.js";
import type { V01SourceName } from "../types/source.js";
import { isV01Source } from "../types/source.js";
import { VERSION } from "../version.js";

export interface GlobalOptions {
  profile?: string | undefined;
  region?: string | undefined;
  source: V01SourceName;
  principalArn?: string | undefined;
  principalRole?: string | undefined;
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
  createCurSource(): CurSource;
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
  if (!isV01Source(source)) {
    throw new Error(`Unsupported source in v0.1: ${source}`);
  }

  let outputFormat: OutputFormat = config.output.default_format;
  if (options.json) {
    outputFormat = "json";
  } else if (options.csv) {
    outputFormat = "csv";
  }

  return {
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
    async resolvePrincipal() {
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
    return { message: msg, exitCode: 1 };
  }
  return { message: String(error), exitCode: 1 };
}
