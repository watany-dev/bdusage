import { getCallerIdentity } from "../aws/sts.js";
import type { CommandContext } from "../cli/context.js";
import { formatPrincipalFilter } from "../types/principal.js";

export async function runWhoami(ctx: CommandContext): Promise<string> {
  const { profile, region } = ctx.config.aws;
  const identity = await getCallerIdentity(region ?? "us-east-1", profile);
  const principal = await ctx.resolvePrincipal();

  return [
    ctx.version,
    `profile: ${profile}`,
    `region: ${region}`,
    `account: ${identity.account}`,
    `caller arn: ${identity.arn}`,
    `resolved principal filter: ${formatPrincipalFilter(principal)}`,
    `config: ${ctx.configPath}`,
    `athena: ${ctx.config.athena.database}.${ctx.config.athena.table} (workgroup: ${ctx.config.athena.workgroup})`,
    "",
  ].join("\n");
}
