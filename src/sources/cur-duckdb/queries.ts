import { costColumn } from "../../config/load.js";
import type { BdusageConfig } from "../../config/schema.js";
import type { PrincipalFilter } from "../../types/principal.js";
import { principalFilterSql } from "../../types/principal.js";
import type { DateRange } from "../../util/dates.js";
import { buildReportQuery } from "../cur/report-query.js";

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

function filteredBedrockUsage(
  config: BdusageConfig,
  principal: PrincipalFilter,
  range: DateRange,
  extraSelect = "",
): string {
  const costCol = costColumn(config.cost.metric);
  const extra = extraSelect ? `,\n  ${extraSelect}` : "";
  return `
SELECT
  line_item_usage_start_date,
  ${costCol} AS cost_col,
  line_item_usage_type,
  line_item_usage_amount${extra}
FROM ${CUR_VIEW}
${baseWhere(config, principal, range)}
`.trim();
}

export function dailyQuery(
  config: BdusageConfig,
  principal: PrincipalFilter,
  range: DateRange,
): string {
  return buildReportQuery(
    filteredBedrockUsage(config, principal, range),
    `
SELECT
  CAST(line_item_usage_start_date AS DATE)::VARCHAR AS usage_date,
  SUM(cost_col) AS cost,
  line_item_usage_type AS usage_type,
  SUM(line_item_usage_amount) AS usage_amount,
  MAX(_freshness.latest_usage) AS latest_usage
FROM filtered
CROSS JOIN _freshness
GROUP BY 1, 3
ORDER BY 1
`.trim(),
  );
}

export function weeklyQuery(
  config: BdusageConfig,
  principal: PrincipalFilter,
  range: DateRange,
): string {
  return buildReportQuery(
    filteredBedrockUsage(config, principal, range),
    `
SELECT
  CAST(date_trunc('week', CAST(line_item_usage_start_date AS DATE)) AS VARCHAR) AS week_start,
  SUM(cost_col) AS cost,
  line_item_usage_type AS usage_type,
  SUM(line_item_usage_amount) AS usage_amount,
  MAX(_freshness.latest_usage) AS latest_usage
FROM filtered
CROSS JOIN _freshness
GROUP BY 1, 3
ORDER BY 1
`.trim(),
  );
}

export function usersByPrincipalQuery(config: BdusageConfig, range: DateRange): string {
  const costCol = costColumn(config.cost.metric);
  const filtered = `
SELECT
  line_item_usage_start_date,
  line_item_iam_principal,
  ${costCol} AS cost_col,
  line_item_usage_type,
  line_item_usage_amount
FROM ${CUR_VIEW}
WHERE line_item_product_code = 'AmazonBedrock'
  AND line_item_line_item_type = 'Usage'
  AND line_item_usage_start_date >= TIMESTAMP '${range.since}'
  AND line_item_usage_start_date < TIMESTAMP '${range.until}'
  AND line_item_iam_principal IS NOT NULL
  AND TRIM(line_item_iam_principal) <> ''
`.trim();

  return buildReportQuery(
    filtered,
    `
SELECT
  line_item_iam_principal AS principal,
  SUM(cost_col) AS cost,
  line_item_usage_type AS usage_type,
  SUM(line_item_usage_amount) AS usage_amount,
  MAX(_freshness.latest_usage) AS latest_usage
FROM filtered
CROSS JOIN _freshness
GROUP BY 1, 3
`.trim(),
  );
}

export function monthlyQuery(
  config: BdusageConfig,
  principal: PrincipalFilter,
  range: DateRange,
): string {
  return buildReportQuery(
    filteredBedrockUsage(config, principal, range),
    `
SELECT
  strftime(line_item_usage_start_date, '%Y-%m') AS usage_month,
  SUM(cost_col) AS cost,
  line_item_usage_type AS usage_type,
  SUM(line_item_usage_amount) AS usage_amount,
  MAX(_freshness.latest_usage) AS latest_usage
FROM filtered
CROSS JOIN _freshness
GROUP BY 1, 3
ORDER BY 1
`.trim(),
  );
}

export function modelsQuery(
  config: BdusageConfig,
  principal: PrincipalFilter,
  range: DateRange,
): string {
  return buildReportQuery(
    filteredBedrockUsage(config, principal, range),
    `
SELECT
  line_item_usage_type AS usage_type,
  SUM(cost_col) AS cost,
  SUM(line_item_usage_amount) AS usage_amount,
  MAX(_freshness.latest_usage) AS latest_usage
FROM filtered
CROSS JOIN _freshness
GROUP BY 1
ORDER BY 2 DESC
`.trim(),
  );
}

export function billingFreshnessQuery(
  config: BdusageConfig,
  principal: PrincipalFilter,
  range: DateRange,
): string {
  return `
SELECT MAX(line_item_usage_start_date) AS latest_usage
FROM ${CUR_VIEW}
${baseWhere(config, principal, range)}
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
