import type { PrincipalFilter } from "../../types/principal.js";

export function logsPrincipalFilterClause(filter: PrincipalFilter): string {
  switch (filter.kind) {
    case "self":
    case "arn":
      return `identity.arn = '${escapeInsightsLiteral(filter.arn)}'`;
    case "role":
      return `identity.arn like '${escapeInsightsLiteral(filter.roleArn)}/%'`;
    case "tag":
      throw new Error(
        "--principal-tag is not supported with --source logs. Use identity.arn filtering (--principal self|arn|role) or --source ce.",
      );
    case "all":
      return "ispresent(identity.arn)";
  }
}

function escapeInsightsLiteral(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
