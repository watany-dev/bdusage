import { describe, expect, it, vi } from "vitest";
import { mergeConfig } from "../config/load.js";
import { DEFAULT_CONFIG } from "../config/schema.js";
import { runDoctorChecks } from "./checks.js";

vi.mock("../sources/cur-duckdb/duckdb.js", () => ({
  createDuckDbExecutor: vi.fn(),
  DuckDbUnavailableError: class DuckDbUnavailableError extends Error {
    name = "DuckDbUnavailableError";
  },
}));

const identity = vi.hoisted(() => ({
  account: "123",
  arn: "arn:aws:sts::123:assumed-role/R/u",
  userId: "A",
}));

vi.mock("../aws/sts.js", () => ({
  getCallerIdentity: vi.fn().mockResolvedValue(identity),
}));

vi.mock("../aws/cost-explorer.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../aws/cost-explorer.js")>();
  return {
    ...actual,
    createCostExplorerClient: vi.fn(),
    LiveCostExplorerClient: class {
      async getCostAndUsage() {
        return [];
      }
    },
  };
});

vi.mock("../aws/cloudwatch-logs.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../aws/cloudwatch-logs.js")>();
  return {
    ...actual,
    createCloudWatchLogsClient: vi.fn(),
    LiveCloudWatchLogsClient: class {
      async runInsightsQuery() {
        return [];
      }
    },
  };
});

describe("runDoctorChecks duckdb", () => {
  const duckConfig = mergeConfig(DEFAULT_CONFIG, {
    cur: {
      engine: "duckdb",
      duckdb: {
        files: ["/tmp/cur.parquet"],
        hive_partitioning: false,
        union_by_name: true,
      },
      athena: DEFAULT_CONFIG.cur.athena,
    },
  });

  it("reports duckdb checks when parquet is reachable", async () => {
    const { createDuckDbExecutor } = await import("../sources/cur-duckdb/duckdb.js");
    vi.mocked(createDuckDbExecutor).mockResolvedValue({
      executeQuery: vi
        .fn()
        .mockResolvedValueOnce([{ line_item_usage_type: "X" }])
        .mockResolvedValueOnce([
          { column_name: "line_item_product_code" },
          { column_name: "line_item_line_item_type" },
          { column_name: "line_item_usage_start_date" },
          { column_name: "line_item_usage_type" },
          { column_name: "line_item_usage_amount" },
          { column_name: "line_item_unblended_cost" },
          { column_name: "line_item_iam_principal" },
        ])
        .mockResolvedValueOnce([{ line_item_iam_principal: "arn:1" }]),
      close: vi.fn(),
    });

    const checks = await runDoctorChecks(duckConfig, "/tmp/config.toml", null);
    expect(checks.find((c) => c.name === "duckdb_httpfs")?.status).toBe("ok");
    expect(checks.find((c) => c.name === "duckdb_sample_bedrock_query")?.status).toBe("ok");
    expect(checks.find((c) => c.name === "duckdb_required_columns")?.status).toBe("ok");
    expect(checks.find((c) => c.name === "duckdb_iam_principal_column")?.status).toBe("ok");
  });

  it("reports httpfs failure distinctly", async () => {
    const { createDuckDbExecutor, DuckDbUnavailableError } = await import(
      "../sources/cur-duckdb/duckdb.js"
    );
    vi.mocked(createDuckDbExecutor).mockRejectedValue(
      new DuckDbUnavailableError("DuckDB httpfs extension could not be loaded: boom"),
    );

    const checks = await runDoctorChecks(duckConfig, "/tmp/config.toml", null);
    expect(checks.find((c) => c.name === "duckdb_httpfs")?.status).toBe("fail");
  });
});
