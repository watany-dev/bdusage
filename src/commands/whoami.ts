import { getCallerIdentity } from "../aws/sts.js";
import type { CommandContext } from "../cli/context.js";
import { hasDuckDbFiles } from "../config/load.js";
import { formatPrincipalFilter } from "../types/principal.js";

export async function runWhoami(ctx: CommandContext): Promise<string> {
  const { profile, region } = ctx.config.aws;
  const identity = await getCallerIdentity(region ?? "us-east-1", profile);
  const principal = await ctx.resolvePrincipal();
  const { cur } = ctx.config;

  const lines = [
    ctx.version,
    `profile: ${profile}`,
    `region: ${region}`,
    `account: ${identity.account}`,
    `caller arn: ${identity.arn}`,
    `resolved principal filter: ${formatPrincipalFilter(principal)}`,
    `config: ${ctx.configPath}`,
    `cur.engine: ${cur.engine}`,
  ];

  if (hasDuckDbFiles(ctx.config)) {
    lines.push(`cur.duckdb.files: ${cur.duckdb.files.join(", ")}`);
  }

  if (cur.athena.output_location) {
    lines.push(
      `cur.athena: ${cur.athena.database}.${cur.athena.table} (workgroup: ${cur.athena.workgroup})`,
    );
  } else {
    lines.push(`cur.athena: ${cur.athena.database}.${cur.athena.table} (no output_location)`);
  }

  lines.push("");
  return lines.join("\n");
}
