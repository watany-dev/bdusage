import { describe, expect, it, vi } from "vitest";
import type { AthenaExecutor } from "../aws/athena.js";
import { mergeConfig } from "../config/load.js";
import { DEFAULT_CONFIG } from "../config/schema.js";
import { CurAthenaSource } from "./cur-athena/source.js";
import { CurDuckDbSource } from "./cur-duckdb/source.js";
import { resolveCurBillingSource } from "./resolve-cur.js";

vi.mock("./cur-duckdb/duckdb.js", () => ({
  createDuckDbExecutor: vi.fn(),
}));

const athenaConfig = mergeConfig(DEFAULT_CONFIG, {
  cur: {
    engine: "athena",
    athena: { ...DEFAULT_CONFIG.cur.athena, output_location: "s3://bucket/out/" },
    duckdb: DEFAULT_CONFIG.cur.duckdb,
  },
});

const duckdbConfig = mergeConfig(DEFAULT_CONFIG, {
  cur: {
    engine: "duckdb",
    duckdb: {
      files: ["/tmp/sample.parquet"],
      hive_partitioning: false,
      union_by_name: true,
    },
    athena: DEFAULT_CONFIG.cur.athena,
  },
});

describe("resolveCurBillingSource", () => {
  const executor: AthenaExecutor = {
    executeQuery: vi.fn().mockResolvedValue([{ line_item_usage_type: "X" }]),
  };

  it("returns Athena source when engine is athena", async () => {
    const source = await resolveCurBillingSource(
      { engine: "athena" },
      athenaConfig,
      { createAthena: () => new CurAthenaSource(executor, athenaConfig) },
      executor,
    );
    expect(source.curEngine).toBe("athena");
  });

  it("returns DuckDB source when engine is duckdb", async () => {
    const { createDuckDbExecutor } = await import("./cur-duckdb/duckdb.js");
    vi.mocked(createDuckDbExecutor).mockResolvedValue({
      executeQuery: vi.fn().mockResolvedValue([{ line_item_usage_type: "X" }]),
      close: vi.fn(),
    });

    const source = await resolveCurBillingSource(
      { engine: "duckdb" },
      duckdbConfig,
      { createAthena: () => new CurAthenaSource(executor, athenaConfig) },
      executor,
    );
    expect(source).toBeInstanceOf(CurDuckDbSource);
    expect(source.curEngine).toBe("duckdb");
  });

  it("prefers DuckDB on auto when files are configured", async () => {
    const { createDuckDbExecutor } = await import("./cur-duckdb/duckdb.js");
    vi.mocked(createDuckDbExecutor).mockResolvedValue({
      executeQuery: vi.fn().mockResolvedValue([{ line_item_usage_type: "X" }]),
      close: vi.fn(),
    });

    const source = await resolveCurBillingSource(
      { engine: "auto" },
      duckdbConfig,
      { createAthena: () => new CurAthenaSource(executor, athenaConfig) },
      executor,
    );
    expect(source.curEngine).toBe("duckdb");
  });

  it("falls back to Athena on auto when DuckDB probe fails", async () => {
    const { createDuckDbExecutor } = await import("./cur-duckdb/duckdb.js");
    vi.mocked(createDuckDbExecutor).mockRejectedValue(new Error("duckdb down"));
    const autoConfig = mergeConfig(duckdbConfig, {
      cur: {
        ...duckdbConfig.cur,
        engine: "auto",
        athena: { ...duckdbConfig.cur.athena, output_location: "s3://bucket/out/" },
      },
    });

    const source = await resolveCurBillingSource(
      { engine: "auto" },
      autoConfig,
      { createAthena: () => new CurAthenaSource(executor, athenaConfig) },
      executor,
    );
    expect(source.curEngine).toBe("athena");
  });

  it("throws when auto cannot use DuckDB or Athena", async () => {
    const { createDuckDbExecutor } = await import("./cur-duckdb/duckdb.js");
    vi.mocked(createDuckDbExecutor).mockRejectedValue(new Error("duckdb down"));
    const autoConfig = mergeConfig(duckdbConfig, {
      cur: {
        ...duckdbConfig.cur,
        engine: "auto",
        athena: { ...duckdbConfig.cur.athena, output_location: "s3://bucket/out/" },
      },
    });

    await expect(
      resolveCurBillingSource(
        { engine: "auto" },
        autoConfig,
        { createAthena: () => new CurAthenaSource(executor, autoConfig) },
        null,
      ),
    ).rejects.toThrow("Could not use CUR backend");
  });

  it("does not fall back to Athena when duckdb engine is requested and fails", async () => {
    const { createDuckDbExecutor } = await import("./cur-duckdb/duckdb.js");
    vi.mocked(createDuckDbExecutor).mockRejectedValue(new Error("duckdb down"));
    const athenaOnly: AthenaExecutor = { executeQuery: vi.fn() };

    await expect(
      resolveCurBillingSource(
        { engine: "duckdb" },
        duckdbConfig,
        { createAthena: () => new CurAthenaSource(athenaOnly, athenaConfig) },
        athenaOnly,
      ),
    ).rejects.toThrow("duckdb down");
    expect(athenaOnly.executeQuery).not.toHaveBeenCalled();
  });
});
