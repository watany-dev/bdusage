import { describe, expect, it } from "vitest";
import { mergeConfig } from "../../config/load.js";
import { DEFAULT_CONFIG } from "../../config/schema.js";
import { createDuckDbExecutor, DuckDbUnavailableError } from "./duckdb.js";

describe("createDuckDbExecutor", () => {
  it("throws when files are not configured", async () => {
    await expect(createDuckDbExecutor(DEFAULT_CONFIG)).rejects.toBeInstanceOf(
      DuckDbUnavailableError,
    );
  });

  it("creates an in-memory session for local parquet paths", async () => {
    const config = mergeConfig(DEFAULT_CONFIG, {
      cur: {
        engine: "duckdb",
        duckdb: {
          files: ["tests/fixtures/cur/missing.parquet"],
          hive_partitioning: false,
          union_by_name: true,
        },
        athena: DEFAULT_CONFIG.cur.athena,
      },
    });
    await expect(createDuckDbExecutor(config)).rejects.toThrow();
  });
});
