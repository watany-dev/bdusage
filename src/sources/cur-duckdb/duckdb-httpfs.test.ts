import { describe, expect, it, vi } from "vitest";
import { mergeConfig } from "../../config/load.js";
import { DEFAULT_CONFIG } from "../../config/schema.js";

const runMock = vi
  .fn()
  .mockRejectedValueOnce(new Error("install failed"))
  .mockResolvedValue(undefined);
const closeSyncMock = vi.fn();

vi.mock("@duckdb/node-api", () => ({
  DuckDBInstance: {
    create: vi.fn().mockResolvedValue({
      connect: vi.fn().mockResolvedValue({
        run: runMock,
        closeSync: closeSyncMock,
      }),
      closeSync: closeSyncMock,
    }),
  },
}));

describe("createDuckDbExecutor httpfs errors", () => {
  it("wraps httpfs load failures", async () => {
    vi.resetModules();
    const { createDuckDbExecutor, DuckDbUnavailableError } = await import("./duckdb.js");
    const config = mergeConfig(DEFAULT_CONFIG, {
      cur: {
        engine: "duckdb",
        duckdb: {
          files: ["s3://bucket/export/**/*.parquet"],
          hive_partitioning: true,
          union_by_name: true,
        },
        athena: DEFAULT_CONFIG.cur.athena,
      },
    });

    await expect(createDuckDbExecutor(config)).rejects.toBeInstanceOf(DuckDbUnavailableError);
  });
});
