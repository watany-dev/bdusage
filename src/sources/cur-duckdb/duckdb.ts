import type { DuckDBInstance } from "@duckdb/node-api";
import { duckDbS3Region, hasDuckDbFiles } from "../../config/load.js";
import type { BdusageConfig } from "../../config/schema.js";
import { escapeSqlLiteral } from "./sql.js";

export interface DuckDbExecutor {
  executeQuery(sql: string): Promise<Array<Record<string, string | null>>>;
  close(): Promise<void>;
}

export class DuckDbUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuckDbUnavailableError";
  }
}

export async function createDuckDbExecutor(config: BdusageConfig): Promise<DuckDbExecutor> {
  if (!hasDuckDbFiles(config)) {
    throw new DuckDbUnavailableError("cur.duckdb.files is not set");
  }

  // Lazy-load the native DuckDB binding so commands that never touch DuckDB
  // (help, Athena/CE/logs sources) don't pay its startup cost.
  const { DuckDBInstance } = await import("@duckdb/node-api");
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();

  const needsS3 = config.cur.duckdb.files.some((f) => f.startsWith("s3://"));
  if (needsS3) {
    try {
      await connection.run("INSTALL httpfs");
      await connection.run("LOAD httpfs");
    } catch (error) {
      await connection.closeSync();
      await instance.closeSync();
      const msg = error instanceof Error ? error.message : String(error);
      throw new DuckDbUnavailableError(`DuckDB httpfs extension could not be loaded: ${msg}`);
    }

    const profile = config.aws.profile ?? "default";
    const region = duckDbS3Region(config);
    await connection.run(`
CREATE OR REPLACE SECRET bdusage_s3 (
  TYPE s3,
  PROVIDER credential_chain,
  CHAIN 'env;config;sso;process;instance',
  PROFILE '${escapeSqlLiteral(profile)}',
  REGION '${escapeSqlLiteral(region)}'
)`);
  }

  const filesSql = formatParquetFiles(config);
  const { hive_partitioning, union_by_name } = config.cur.duckdb;
  await connection.run(`
CREATE OR REPLACE VIEW cost_and_usage_report AS
SELECT *
FROM read_parquet(
  ${filesSql},
  union_by_name = ${union_by_name},
  hive_partitioning = ${hive_partitioning}
)`);

  return new LiveDuckDbExecutor(connection, instance);
}

function formatParquetFiles(config: BdusageConfig): string {
  const paths = config.cur.duckdb.files.map((f) => `'${escapeSqlLiteral(f)}'`);
  if (paths.length === 1) {
    return paths[0] ?? "''";
  }
  return `[${paths.join(", ")}]`;
}

class LiveDuckDbExecutor implements DuckDbExecutor {
  constructor(
    private readonly connection: Awaited<ReturnType<DuckDBInstance["connect"]>>,
    private readonly instance: DuckDBInstance,
  ) {}

  async executeQuery(sql: string): Promise<Array<Record<string, string | null>>> {
    const reader = await this.connection.runAndReadAll(sql);
    const objects = reader.getRowObjects() as Record<string, unknown>[];
    return objects.map((row) => {
      const out: Record<string, string | null> = {};
      for (const [key, value] of Object.entries(row)) {
        out[key] =
          value == null ? null : typeof value === "object" ? JSON.stringify(value) : String(value);
      }
      return out;
    });
  }

  async close(): Promise<void> {
    this.connection.closeSync();
    this.instance.closeSync();
  }
}
