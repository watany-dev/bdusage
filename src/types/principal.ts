export type PrincipalFilter =
  | { kind: "self"; arn: string }
  | { kind: "arn"; arn: string }
  | { kind: "role"; roleArn: string }
  | { kind: "all" };

export function principalFilterSql(filter: PrincipalFilter): string {
  switch (filter.kind) {
    case "self":
    case "arn":
      return `line_item_iam_principal = '${escapeSqlLiteral(filter.arn)}'`;
    case "role":
      return `line_item_iam_principal LIKE '${escapeSqlLiteral(filter.roleArn)}/%'`;
    case "all":
      return "1 = 1";
  }
}

export function formatPrincipalFilter(filter: PrincipalFilter): string {
  switch (filter.kind) {
    case "self":
    case "arn":
      return filter.arn;
    case "role":
      return `${filter.roleArn}/*`;
    case "all":
      return "(all principals — admin)";
  }
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}
