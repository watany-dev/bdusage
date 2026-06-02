import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { DuckDBInstance } from "@duckdb/node-api";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mergeConfig } from "../../config/load.js";
import { DEFAULT_CONFIG } from "../../config/schema.js";
import { createDuckDbExecutor } from "./duckdb.js";
import { CurDuckDbSource } from "./source.js";

const FIXTURE_DIR = join(import.meta.dirname, "../../../tests/fixtures/cur");
const FIXTURE_FILE = join(FIXTURE_DIR, "bedrock-sample.parquet");

describe("CurDuckDbSource integration", () => {
  beforeAll(async () => {
    await mkdir(FIXTURE_DIR, { recursive: true });
    const instance = await DuckDBInstance.create(":memory:");
    const connection = await instance.connect();
    await connection.run(`
COPY (
  SELECT
    'AmazonBedrock' AS line_item_product_code,
    'Usage' AS line_item_line_item_type,
    TIMESTAMP '2026-05-15 12:00:00' AS line_item_usage_start_date,
    'USE1-Claude3.5Sonnet-Input' AS line_item_usage_type,
    CAST(1000 AS DOUBLE) AS line_item_usage_amount,
    CAST(0.05 AS DOUBLE) AS line_item_unblended_cost,
    'arn:aws:iam::123456789012:role/Dev' AS line_item_iam_principal
  UNION ALL
  SELECT
    'AmazonBedrock',
    'Usage',
    TIMESTAMP '2026-05-16 08:00:00',
    'USE1-Claude3.5Sonnet-Output',
    CAST(500 AS DOUBLE),
    CAST(0.03 AS DOUBLE),
    'arn:aws:iam::123456789012:role/Dev'
) TO '${FIXTURE_FILE.replace(/'/g, "''")}' (FORMAT PARQUET)
`);
    connection.closeSync();
    instance.closeSync();
  });

  afterAll(async () => {
    await rm(FIXTURE_FILE, { force: true });
  });

  it("aggregates daily costs from local Parquet", async () => {
    const config = mergeConfig(DEFAULT_CONFIG, {
      cur: {
        engine: "duckdb",
        duckdb: {
          files: [FIXTURE_FILE],
          hive_partitioning: false,
          union_by_name: true,
        },
        athena: DEFAULT_CONFIG.cur.athena,
      },
    });

    const executor = await createDuckDbExecutor(config);
    const source = new CurDuckDbSource(executor, config);
    const principal = {
      kind: "self" as const,
      arn: "arn:aws:iam::123456789012:role/Dev",
    };
    const rows = await source.fetchDaily(principal, {
      since: "2026-05-01",
      until: "2026-06-01",
    });
    await executor.close();

    expect(rows.length).toBeGreaterThanOrEqual(1);
    const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);
    expect(totalCost).toBeCloseTo(0.08, 5);
  });
});
