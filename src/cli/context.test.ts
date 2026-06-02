import { describe, expect, it, vi } from "vitest";
import { ConfigError } from "../config/load.js";
import { buildCommandContext, mapCliError } from "./context.js";

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
      cost: { metric: "unblended" as const },
      output: { default_format: "table" as const, currency: "USD" },
    }),
  };
});

vi.mock("../aws/sts.js", () => ({
  getCallerIdentity: vi.fn().mockResolvedValue({
    account: "123",
    arn: "arn:aws:sts::123:assumed-role/R/u",
    userId: "A",
  }),
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

  it("rejects unsupported source values", async () => {
    await expect(buildCommandContext({ source: "logs" as "cur" })).rejects.toThrow(
      "Unsupported source",
    );
  });

  it("creates cur source factory", async () => {
    const ctx = await buildCommandContext({ source: "cur" });
    expect(ctx.createCurSource()).toBeDefined();
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
    expect(mapCliError("x").message).toBe("x");
  });
});
