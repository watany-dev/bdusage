import { afterEach, describe, expect, it, vi } from "vitest";
import { mergeConfig } from "../../config/load.js";
import { DEFAULT_CONFIG } from "../../config/schema.js";

const runMock = vi.fn().mockResolvedValue(undefined);
const closeSyncMock = vi.fn();

vi.mock("@duckdb/node-api", () => ({
  DuckDBInstance: {
    create: vi.fn().mockResolvedValue({
      connect: vi.fn().mockResolvedValue({
        run: runMock,
        runAndReadAll: vi.fn().mockResolvedValue({
          getRowObjects: () => [{ n: 1 }],
        }),
        closeSync: closeSyncMock,
      }),
      closeSync: closeSyncMock,
    }),
  },
}));

describe("createDuckDbExecutor S3 setup", () => {
  afterEach(() => {
    runMock.mockClear();
  });

  it("loads httpfs and configures S3 secret for s3:// paths", async () => {
    vi.resetModules();
    const { createDuckDbExecutor } = await import("./duckdb.js");
    const config = mergeConfig(DEFAULT_CONFIG, {
      cur: {
        engine: "duckdb",
        duckdb: {
          files: ["s3://bucket/export/**/*.parquet"],
          s3_region: "ap-northeast-1",
          hive_partitioning: true,
          union_by_name: true,
        },
        athena: DEFAULT_CONFIG.cur.athena,
      },
    });

    const executor = await createDuckDbExecutor(config);
    await executor.executeQuery("SELECT 1 AS n");
    await executor.close();

    const sql = runMock.mock.calls.map((call) => String(call[0]));
    expect(sql.some((s) => s.includes("INSTALL httpfs"))).toBe(true);
    expect(sql.some((s) => s.includes("CREATE OR REPLACE SECRET bdusage_s3"))).toBe(true);
    expect(sql.some((s) => s.includes("read_parquet"))).toBe(true);
  });

  it("formats multiple parquet paths as a DuckDB list", async () => {
    vi.resetModules();
    const { createDuckDbExecutor } = await import("./duckdb.js");
    const config = mergeConfig(DEFAULT_CONFIG, {
      cur: {
        engine: "duckdb",
        duckdb: {
          files: ["s3://bucket/a.parquet", "s3://bucket/b.parquet"],
          hive_partitioning: true,
          union_by_name: true,
        },
        athena: DEFAULT_CONFIG.cur.athena,
      },
    });

    const executor = await createDuckDbExecutor(config);
    await executor.close();

    const sql = runMock.mock.calls.map((call) => String(call[0])).join("\n");
    expect(sql).toContain("s3://bucket/a.parquet");
    expect(sql).toContain("[");
  });
});
