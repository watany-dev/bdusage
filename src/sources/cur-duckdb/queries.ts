import { costColumn } from "../../config/load.js";
import type { BdusageConfig } from "../../config/schema.js";
import type { PrincipalFilter } from "../../types/principal.js";
import { principalFilterSql } from "../../types/principal.js";
import type { DateRange } from "../../util/dates.js";

const CUR_VIEW = "cost_and_usage_report";

function baseWhere(config: BdusageConfig, principal: PrincipalFilter, range: DateRange): string {
  return `
WHERE line_item_product_code = 'AmazonBedrock'
  AND line_item_line_item_type = 'Usage'
  AND line_item_usage_start_date >= TIMESTAMP '${range.since}'
  AND line_item_usage_start_date < TIMESTAMP '${range.until}'
  AND ${principalFilterSql(principal)}
`.trim();
}

export function dailyQuery(
  config: BdusageConfig,
  principal: PrincipalFilter,
  range: DateRange,
): string {
  const costCol = costColumn(config.cost.metric);
  return `
SELECT
  CAST(line_item_usage_start_date AS DATE)::VARCHAR AS usage_date,
  SUM(${costCol}) AS cost,
  line_item_usage_type AS usage_type,
  SUM(line_item_usage_amount) AS usage_amount
FROM ${CUR_VIEW}
${baseWhere(config, principal, range)}
GROUP BY 1, 3
ORDER BY 1
`.trim();
}

export function monthlyQuery(
  config: BdusageConfig,
  principal: PrincipalFilter,
  range: DateRange,
): string {
  const costCol = costColumn(config.cost.metric);
  return `
SELECT
  strftime(line_item_usage_start_date, '%Y-%m') AS usage_month,
  SUM(${costCol}) AS cost,
  line_item_usage_type AS usage_type,
  SUM(line_item_usage_amount) AS usage_amount
FROM ${CUR_VIEW}
${baseWhere(config, principal, range)}
GROUP BY 1, 3
ORDER BY 1
`.trim();
}

export function modelsQuery(
  config: BdusageConfig,
  principal: PrincipalFilter,
  range: DateRange,
): string {
  const costCol = costColumn(config.cost.metric);
  return `
SELECT
  line_item_usage_type AS usage_type,
  SUM(${costCol}) AS cost,
  SUM(line_item_usage_amount) AS usage_amount
FROM ${CUR_VIEW}
${baseWhere(config, principal, range)}
GROUP BY 1
ORDER BY 2 DESC
`.trim();
}

export function billingFreshnessQuery(config: BdusageConfig, principal: PrincipalFilter): string {
  return `
SELECT MAX(line_item_usage_start_date) AS latest_usage
FROM ${CUR_VIEW}
WHERE line_item_product_code = 'AmazonBedrock'
  AND line_item_line_item_type = 'Usage'
  AND ${principalFilterSql(principal)}
`.trim();
}

export function iamPrincipalColumnCheckQuery(): string {
  return `
SELECT line_item_iam_principal
FROM ${CUR_VIEW}
WHERE line_item_product_code = 'AmazonBedrock'
  AND line_item_iam_principal IS NOT NULL
  AND line_item_iam_principal <> ''
LIMIT 1
`.trim();
}

export function sampleBedrockQuery(): string {
  return `
SELECT line_item_usage_type
FROM ${CUR_VIEW}
WHERE line_item_product_code = 'AmazonBedrock'
  AND line_item_line_item_type = 'Usage'
LIMIT 1
`.trim();
}

export function describeCurViewQuery(): string {
  return `DESCRIBE SELECT * FROM ${CUR_VIEW}`;
}
