import { costColumn } from "../../config/load.js";
import type { BdusageConfig } from "../../config/schema.js";
import type { PrincipalFilter } from "../../types/principal.js";
import { principalFilterSql } from "../../types/principal.js";

export interface DateRange {
  since: string;
  until: string;
}

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
  const { database, table } = config.athena;
  return `
SELECT
  CAST(DATE(line_item_usage_start_date) AS VARCHAR) AS usage_date,
  SUM(${costCol}) AS cost,
  line_item_usage_type AS usage_type,
  SUM(line_item_usage_amount) AS usage_amount
FROM ${database}.${table}
${baseWhere(config, principal, range)}
GROUP BY 1, 3
ORDER BY 1
`.trim();
}

export function weeklyQuery(
  config: BdusageConfig,
  principal: PrincipalFilter,
  range: DateRange,
): string {
  const costCol = costColumn(config.cost.metric);
  const { database, table } = config.athena;
  return `
SELECT
  CAST(
    date_add(
      'day',
      -(day_of_week(CAST(line_item_usage_start_date AS DATE)) - 1),
      CAST(line_item_usage_start_date AS DATE)
    ) AS VARCHAR
  ) AS week_start,
  SUM(${costCol}) AS cost,
  line_item_usage_type AS usage_type,
  SUM(line_item_usage_amount) AS usage_amount
FROM ${database}.${table}
${baseWhere(config, principal, range)}
GROUP BY 1, 3
ORDER BY 1
`.trim();
}

export function usersByPrincipalQuery(config: BdusageConfig, range: DateRange): string {
  const costCol = costColumn(config.cost.metric);
  const { database, table } = config.athena;
  return `
SELECT
  line_item_iam_principal AS principal,
  SUM(${costCol}) AS cost,
  line_item_usage_type AS usage_type,
  SUM(line_item_usage_amount) AS usage_amount
FROM ${database}.${table}
WHERE line_item_product_code = 'AmazonBedrock'
  AND line_item_line_item_type = 'Usage'
  AND line_item_usage_start_date >= TIMESTAMP '${range.since}'
  AND line_item_usage_start_date < TIMESTAMP '${range.until}'
  AND line_item_iam_principal IS NOT NULL
  AND TRIM(line_item_iam_principal) <> ''
GROUP BY 1, 3
ORDER BY 2 DESC
`.trim();
}

export function monthlyQuery(
  config: BdusageConfig,
  principal: PrincipalFilter,
  range: DateRange,
): string {
  const costCol = costColumn(config.cost.metric);
  const { database, table } = config.athena;
  return `
SELECT
  date_format(line_item_usage_start_date, '%Y-%m') AS usage_month,
  SUM(${costCol}) AS cost,
  line_item_usage_type AS usage_type,
  SUM(line_item_usage_amount) AS usage_amount
FROM ${database}.${table}
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
  const { database, table } = config.athena;
  return `
SELECT
  line_item_usage_type AS usage_type,
  SUM(${costCol}) AS cost,
  SUM(line_item_usage_amount) AS usage_amount
FROM ${database}.${table}
${baseWhere(config, principal, range)}
GROUP BY 1
ORDER BY 2 DESC
`.trim();
}

export function billingFreshnessQuery(config: BdusageConfig, principal: PrincipalFilter): string {
  const { database, table } = config.athena;
  return `
SELECT MAX(line_item_usage_start_date) AS latest_usage
FROM ${database}.${table}
WHERE line_item_product_code = 'AmazonBedrock'
  AND line_item_line_item_type = 'Usage'
  AND ${principalFilterSql(principal)}
`.trim();
}

export function iamPrincipalColumnCheckQuery(config: BdusageConfig): string {
  const { database, table } = config.athena;
  return `
SELECT line_item_iam_principal
FROM ${database}.${table}
WHERE line_item_product_code = 'AmazonBedrock'
  AND line_item_iam_principal IS NOT NULL
  AND line_item_iam_principal <> ''
LIMIT 1
`.trim();
}

export function sampleBedrockQuery(config: BdusageConfig): string {
  const { database, table } = config.athena;
  return `
SELECT line_item_usage_type
FROM ${database}.${table}
WHERE line_item_product_code = 'AmazonBedrock'
  AND line_item_line_item_type = 'Usage'
LIMIT 1
`.trim();
}
