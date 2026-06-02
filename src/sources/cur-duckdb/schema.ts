import { costColumn } from "../../config/load.js";
import type { BdusageConfig } from "../../config/schema.js";
import type { DuckDbExecutor } from "./duckdb.js";
import { describeCurViewQuery } from "./queries.js";

const REQUIRED_COLUMNS = [
  "line_item_product_code",
  "line_item_line_item_type",
  "line_item_usage_start_date",
  "line_item_usage_type",
  "line_item_usage_amount",
  "line_item_iam_principal",
] as const;

function requiredCostColumns(metric: BdusageConfig["cost"]["metric"]): string[] {
  return [costColumn(metric)];
}

export async function checkRequiredColumns(
  executor: DuckDbExecutor,
  config: BdusageConfig,
): Promise<{ ok: boolean; missing: string[] }> {
  const rows = await executor.executeQuery(describeCurViewQuery());
  const present = new Set(rows.map((r) => r["column_name"] ?? "").filter(Boolean));
  const needed = [...REQUIRED_COLUMNS, ...requiredCostColumns(config.cost.metric)];
  const missing = needed.filter((col) => !present.has(col));
  return { ok: missing.length === 0, missing };
}
