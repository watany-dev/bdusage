import type { CommandContext } from "../cli/context.js";
import type { BillingSource } from "../sources/billing-source.js";

const USERS_REQUIRES_ALL =
  "users ranks Bedrock cost by IAM principal; pass --all (admin-oriented, requires CUR read access).";

const USERS_CONFLICTING_FILTERS =
  "users does not accept --principal, --principal-role, --principal-tag, or --principal-from-profile; use --all only.";

const USERS_REQUIRES_CUR =
  "users requires --source cur (IAM principal ranking). Cost Explorer cannot group by IAM principal ARN.";

export function assertUsersCommandOptions(ctx: CommandContext): void {
  if (!ctx.options.allPrincipals) {
    throw new Error(USERS_REQUIRES_ALL);
  }
  if (
    ctx.options.principalArn ||
    ctx.options.principalRole ||
    ctx.options.principalTag ||
    ctx.options.principalFromProfile
  ) {
    throw new Error(USERS_CONFLICTING_FILTERS);
  }
  if (ctx.options.source === "logs") {
    throw new Error("users uses billing data (--source cur, ce, or auto).");
  }
}

export function assertUsersBillingSource(billing: BillingSource): void {
  if (billing.resolved !== "cur") {
    throw new Error(USERS_REQUIRES_CUR);
  }
}
