import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "../config/schema.js";
import { overallStatus, runDoctorChecks } from "./checks.js";

const config = {
  ...DEFAULT_CONFIG,
  cur: {
    ...DEFAULT_CONFIG.cur,
    athena: {
      ...DEFAULT_CONFIG.cur.athena,
      output_location: "s3://bucket/prefix/",
    },
  },
  athena: {
    ...DEFAULT_CONFIG.cur.athena,
    output_location: "s3://bucket/prefix/",
  },
};

const identity = {
  account: "123",
  arn: "arn:aws:sts::123:assumed-role/R/u",
  userId: "A",
};

vi.mock("../aws/sts.js", () => ({
  getCallerIdentity: vi.fn(),
}));

const runInsightsQueryMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const getCostAndUsageMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));

vi.mock("../aws/cloudwatch-logs.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../aws/cloudwatch-logs.js")>();
  return {
    ...actual,
    createCloudWatchLogsClient: vi.fn(),
    LiveCloudWatchLogsClient: class {
      runInsightsQuery = runInsightsQueryMock;
    },
  };
});

vi.mock("../aws/cost-explorer.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../aws/cost-explorer.js")>();
  return {
    ...actual,
    createCostExplorerClient: vi.fn(),
    LiveCostExplorerClient: class {
      getCostAndUsage = getCostAndUsageMock;
    },
  };
});

describe("runDoctorChecks", () => {
  it("reports ok when principal column has data", async () => {
    const { getCallerIdentity } = await import("../aws/sts.js");
    vi.mocked(getCallerIdentity).mockResolvedValueOnce(identity);

    const checks = await runDoctorChecks(config, "/tmp/config.toml", {
      executeQuery: vi
        .fn()
        .mockResolvedValueOnce([{ line_item_usage_type: "X" }])
        .mockResolvedValueOnce([{ line_item_iam_principal: "arn:1" }]),
    });
    expect(checks.find((c) => c.name === "aws_credentials")?.status).toBe("ok");
    expect(checks.find((c) => c.name === "athena_iam_principal_column")?.status).toBe("ok");
    expect(overallStatus(checks)).toBe("ok");
  });

  it("fails when iam principal column empty", async () => {
    const { getCallerIdentity } = await import("../aws/sts.js");
    vi.mocked(getCallerIdentity).mockResolvedValueOnce(identity);

    const checks = await runDoctorChecks(config, "/tmp/config.toml", {
      executeQuery: vi
        .fn()
        .mockResolvedValueOnce([{ line_item_usage_type: "X" }])
        .mockResolvedValueOnce([]),
    });
    const principal = checks.find((c) => c.name === "athena_iam_principal_column");
    expect(principal?.status).toBe("fail");
    expect(principal?.fix).toContain("IAM principal");
  });

  it("handles credential failure", async () => {
    const { getCallerIdentity } = await import("../aws/sts.js");
    vi.mocked(getCallerIdentity).mockRejectedValueOnce(new Error("no creds"));

    const checks = await runDoctorChecks(config, "/tmp/config.toml", null);
    expect(checks.find((c) => c.name === "aws_credentials")?.status).toBe("fail");
  });

  it("warns when output_location empty", async () => {
    const { getCallerIdentity } = await import("../aws/sts.js");
    vi.mocked(getCallerIdentity).mockResolvedValueOnce(identity);

    const checks = await runDoctorChecks(
      {
        ...config,
        cur: {
          ...config.cur,
          athena: { ...config.cur.athena, output_location: "" },
        },
        athena: { ...config.athena, output_location: "" },
      },
      "/tmp/config.toml",
      null,
    );
    expect(checks.find((c) => c.name === "athena_output_location")?.status).toBe("warn");
  });

  it("skips athena when executor is null", async () => {
    const { getCallerIdentity } = await import("../aws/sts.js");
    vi.mocked(getCallerIdentity).mockResolvedValueOnce(identity);

    const checks = await runDoctorChecks(config, "/tmp/config.toml", null);
    expect(checks.find((c) => c.name === "athena_query")?.status).toBe("warn");
  });

  it("handles iam principal query error mentioning column", async () => {
    const { getCallerIdentity } = await import("../aws/sts.js");
    vi.mocked(getCallerIdentity).mockResolvedValueOnce(identity);

    const checks = await runDoctorChecks(config, "/tmp/config.toml", {
      executeQuery: vi
        .fn()
        .mockResolvedValueOnce([{ line_item_usage_type: "X" }])
        .mockRejectedValueOnce(new Error("line_item_iam_principal not found")),
    });
    expect(checks.find((c) => c.name === "athena_iam_principal_column")?.status).toBe("fail");
  });

  it("handles sample query failure", async () => {
    const { getCallerIdentity } = await import("../aws/sts.js");
    vi.mocked(getCallerIdentity).mockResolvedValueOnce(identity);

    const checks = await runDoctorChecks(config, "/tmp/config.toml", {
      executeQuery: vi.fn().mockRejectedValue(new Error("AccessDenied")),
    });
    expect(checks.find((c) => c.name === "athena_sample_bedrock_query")?.status).toBe("fail");
  });

  it("warns when logs log_group is missing", async () => {
    const { getCallerIdentity } = await import("../aws/sts.js");
    vi.mocked(getCallerIdentity).mockResolvedValueOnce(identity);

    const checks = await runDoctorChecks(
      { ...config, logs: { log_group: "" } },
      "/tmp/config.toml",
      null,
    );
    expect(checks.find((c) => c.name === "logs_log_group")?.status).toBe("warn");
  });

  it("warns when logs insights query fails", async () => {
    const { getCallerIdentity } = await import("../aws/sts.js");
    vi.mocked(getCallerIdentity).mockResolvedValueOnce(identity);
    runInsightsQueryMock.mockRejectedValueOnce(new Error("AccessDenied"));

    const checks = await runDoctorChecks(
      { ...config, logs: { log_group: "/aws/bedrock/modelinvocations" } },
      "/tmp/config.toml",
      null,
    );
    expect(checks.find((c) => c.name === "logs_insights_query")?.status).toBe("warn");
  });

  it("includes logs principal filter guidance in insights check", async () => {
    const { getCallerIdentity } = await import("../aws/sts.js");
    vi.mocked(getCallerIdentity).mockResolvedValueOnce(identity);

    const checks = await runDoctorChecks(
      { ...config, logs: { log_group: "/aws/bedrock/modelinvocations" } },
      "/tmp/config.toml",
      null,
    );
    expect(checks.find((c) => c.name === "logs_insights_query")?.message).toContain("identity.arn");
    expect(checks.some((c) => c.name === "logs_principal_filter")).toBe(false);
  });

  it("includes Cost Explorer tag guidance in ce check", async () => {
    const { getCallerIdentity } = await import("../aws/sts.js");
    vi.mocked(getCallerIdentity).mockResolvedValueOnce(identity);

    const checks = await runDoctorChecks(config, "/tmp/config.toml", null);
    expect(checks.find((c) => c.name === "ce_bedrock_access")?.message).toContain(
      "--principal-tag",
    );
    expect(checks.some((c) => c.name === "ce_principal_tag")).toBe(false);
  });

  it("warns on Cost Explorer access failure", async () => {
    const { getCallerIdentity } = await import("../aws/sts.js");
    vi.mocked(getCallerIdentity).mockResolvedValueOnce(identity);
    getCostAndUsageMock.mockRejectedValueOnce(new Error("AccessDenied"));

    const checks = await runDoctorChecks(config, "/tmp/config.toml", null);
    expect(checks.find((c) => c.name === "ce_bedrock_access")?.status).toBe("warn");
    getCostAndUsageMock.mockResolvedValue([]);
  });

  it("uses raw message when iam principal query fails without column hint", async () => {
    const { getCallerIdentity } = await import("../aws/sts.js");
    vi.mocked(getCallerIdentity).mockResolvedValueOnce(identity);

    const checks = await runDoctorChecks(config, "/tmp/config.toml", {
      executeQuery: vi
        .fn()
        .mockResolvedValueOnce([{ line_item_usage_type: "X" }])
        .mockRejectedValueOnce(new Error("Query timeout")),
    });
    const principal = checks.find((c) => c.name === "athena_iam_principal_column");
    expect(principal?.status).toBe("fail");
    expect(principal?.message).toBe("Query timeout");
  });

  it("warns athena_query when neither Athena nor DuckDB is configured", async () => {
    const { getCallerIdentity } = await import("../aws/sts.js");
    vi.mocked(getCallerIdentity).mockResolvedValueOnce(identity);

    const checks = await runDoctorChecks(
      {
        ...config,
        cur: {
          ...config.cur,
          duckdb: { ...config.cur.duckdb, files: [] },
          athena: { ...config.cur.athena, output_location: "" },
        },
      },
      "/tmp/config.toml",
      null,
    );
    expect(checks.find((c) => c.name === "athena_query")?.status).toBe("warn");
  });

  it("overallStatus is fail when any check fails", () => {
    expect(
      overallStatus([
        { name: "x", status: "ok" },
        { name: "y", status: "fail" },
      ]),
    ).toBe("fail");
  });
});
