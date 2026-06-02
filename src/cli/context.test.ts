import { describe, expect, it, vi } from "vitest";
import { ConfigError } from "../config/load.js";
import { buildCommandContext, mapCliError, resolvePrincipalForBilling } from "./context.js";

vi.mock("../config/load.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config/load.js")>();
  return {
    ...actual,
    loadConfigFile: vi.fn().mockResolvedValue({
      aws: { profile: "cfg", region: "ap-northeast-1" },
      athena: {
        database: "cur",
        table: "t",
        workgroup: "wg",
        output_location: "s3://x/",
      },
      logs: { log_group: "/aws/bedrock/modelinvocations" },
      cost: { metric: "unblended" as const },
      output: { default_format: "table" as const, currency: "USD" },
    }),
  };
});

vi.mock("../aws/cloudwatch-logs.js", () => ({
  createCloudWatchLogsClient: vi.fn(),
  LiveCloudWatchLogsClient: class {
    async runInsightsQuery() {
      return [
        {
          modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
          requests: "1",
          input_tokens: "10",
          output_tokens: "5",
        },
      ];
    }
  },
}));

vi.mock("../aws/pricing.js", () => ({
  createPricingClient: vi.fn(),
  LivePricingCatalog: class {
    async getModelRates() {
      return {
        inputPerToken: 0.000003,
        outputPerToken: 0.000015,
        cacheReadPerToken: 0,
        cacheWritePerToken: 0,
      };
    }
  },
}));

vi.mock("../aws/sts.js", () => ({
  getCallerIdentity: vi.fn().mockResolvedValue({
    account: "123",
    arn: "arn:aws:sts::123:assumed-role/R/u",
    userId: "A",
  }),
}));

vi.mock("../aws/athena.js", () => ({
  createAthenaClient: vi.fn(),
  LiveAthenaExecutor: class {
    async executeQuery() {
      return [{ line_item_usage_type: "X" }];
    }
  },
}));

vi.mock("../aws/cost-explorer.js", () => ({
  createCostExplorerClient: vi.fn(),
  LiveCostExplorerClient: class {
    async getCostAndUsage() {
      return [];
    }
  },
}));

describe("buildCommandContext", () => {
  it("merges CLI profile with config", async () => {
    const ctx = await buildCommandContext({
      source: "cur",
      profile: "cli-profile",
      json: true,
    });
    expect(ctx.config.aws.profile).toBe("cli-profile");
    expect(ctx.outputFormat).toBe("json");
  });

  it("resolves self, arn, and all principals", async () => {
    const ctx = await buildCommandContext({ source: "auto" });
    expect((await ctx.resolvePrincipal()).kind).toBe("self");

    const arnCtx = await buildCommandContext({
      source: "cur",
      principalArn: "arn:aws:iam::1:user/alice",
    });
    expect((await arnCtx.resolvePrincipal()).kind).toBe("arn");

    const allCtx = await buildCommandContext({ source: "cur", allPrincipals: true });
    expect((await allCtx.resolvePrincipal()).kind).toBe("all");
  });

  it("rejects invalid source values", async () => {
    await expect(buildCommandContext({ source: "nope" as "cur" })).rejects.toThrow(
      "Unsupported source",
    );
  });

  it("creates cur source factory", async () => {
    const ctx = await buildCommandContext({ source: "cur" });
    expect(ctx.createCurSource()).toBeDefined();
  });

  it("resolves principal tag and role", async () => {
    const tagCtx = await buildCommandContext({
      source: "ce",
      principalTag: "user=alice",
    });
    expect((await tagCtx.resolvePrincipal()).kind).toBe("tag");

    const roleCtx = await buildCommandContext({
      source: "cur",
      principalRole: "arn:aws:iam::1:role/R",
    });
    expect((await roleCtx.resolvePrincipal()).kind).toBe("role");
  });

  it("createBillingSource resolves cur and ce", async () => {
    const curCtx = await buildCommandContext({ source: "cur" });
    const curBilling = await curCtx.createBillingSource();
    expect(curBilling.resolved).toBe("cur");

    const ceCtx = await buildCommandContext({ source: "ce" });
    const ceBilling = await ceCtx.createBillingSource();
    expect(ceBilling.resolved).toBe("ce");
  });

  it("createEstimateSource returns logs source", async () => {
    const ctx = await buildCommandContext({ source: "logs" });
    const estimate = await ctx.createEstimateSource();
    expect(estimate.resolved).toBe("logs");
  });
});

describe("resolvePrincipalForBilling", () => {
  it("rejects tag principal for cur billing", async () => {
    const ctx = await buildCommandContext({ source: "cur", principalTag: "user=alice" });
    const billing = { resolved: "cur" as const };
    await expect(resolvePrincipalForBilling(ctx, billing)).rejects.toThrow("principal-tag");
  });
});

describe("mapCliError", () => {
  it("maps config, credentials, athena, iam, access errors", () => {
    expect(mapCliError(new ConfigError("missing")).message).toContain("missing");
    expect(mapCliError(new Error("Missing credentials in config")).message).toContain(
      "AWS credentials",
    );
    expect(mapCliError(new Error("Athena query failed")).message).toContain("Athena");
    expect(mapCliError(new Error("line_item_iam_principal missing")).message).toContain("doctor");
    expect(mapCliError(new Error("AccessDeniedException")).message).toContain("Access denied");
    expect(mapCliError(new Error("Cost Explorer cannot filter")).message).toContain(
      "Cost Explorer",
    );
    expect(mapCliError(new Error("--principal-tag is only supported")).exitCode).toBe(1);
    expect(mapCliError("x").message).toBe("x");
  });
});
