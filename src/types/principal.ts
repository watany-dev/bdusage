export type PrincipalFilter =
  | { kind: "self"; arn: string }
  | { kind: "arn"; arn: string }
  | { kind: "role"; roleArn: string }
  | { kind: "tag"; key: string; value: string }
  | { kind: "all" };

export function principalFilterSql(filter: PrincipalFilter): string {
  switch (filter.kind) {
    case "self":
    case "arn":
      return `line_item_iam_principal = '${escapeSqlLiteral(filter.arn)}'`;
    case "role":
      return `line_item_iam_principal LIKE '${escapeSqlLiteral(filter.roleArn)}/%'`;
    case "tag":
      throw new Error("principal tag filter is not valid for CUR queries");
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
    case "tag":
      return `tag:${filter.key}=${filter.value}`;
    case "all":
      return "(all principals — admin)";
  }
}

export function parsePrincipalTag(value: string): { key: string; value: string } {
  const eq = value.indexOf("=");
  if (eq <= 0 || eq === value.length - 1) {
    throw new Error(`Invalid --principal-tag: expected key=value, got "${value}"`);
  }
  return { key: value.slice(0, eq), value: value.slice(eq + 1) };
}

export function assertCurPrincipalFilter(filter: PrincipalFilter): void {
  if (filter.kind === "tag") {
    throw new Error(
      "--principal-tag is only supported with --source ce. Use --source cur for IAM principal filtering.",
    );
  }
}

export function assertCePrincipalFilter(filter: PrincipalFilter): void {
  switch (filter.kind) {
    case "tag":
    case "all":
      return;
    case "self":
    case "arn":
    case "role":
      throw new Error(
        "Cost Explorer cannot filter by IAM principal ARN. Use --principal-tag <key=value> or --source cur.",
      );
  }
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}
