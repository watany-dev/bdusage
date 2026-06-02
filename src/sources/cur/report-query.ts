/** CUR report SQL: one filtered scan with inline freshness (no second query). */
export function buildReportQuery(filteredSelect: string, aggregatedSelect: string): string {
  return `
WITH filtered AS (
${indent(filteredSelect, 2)}
),
_freshness AS (
  SELECT CAST(MAX(line_item_usage_start_date) AS VARCHAR) AS latest_usage
  FROM filtered
)
${aggregatedSelect.trim()}
`.trim();
}

function indent(sql: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return sql
    .split("\n")
    .map((line) => (line.length > 0 ? `${pad}${line}` : line))
    .join("\n");
}
