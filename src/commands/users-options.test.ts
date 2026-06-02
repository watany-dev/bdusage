import { describe, expect, it } from "vitest";
import type { CommandContext } from "../cli/context.js";
import { DEFAULT_CONFIG } from "../config/schema.js";
import { assertUsersBillingSource, assertUsersCommandOptions } from "./users-options.js";

function baseCtx(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    version: "bdusage v0.3.0",
    configPath: "/tmp/config.toml",
    config: DEFAULT_CONFIG,
    options: { source: "cur", allPrincipals: true },
    outputFormat: "table",
    createCurSource: () => {
      throw new Error("not used");
    },
    createBillingSource: async () => {
      throw new Error("not used");
    },
    createEstimateSource: async () => {
      throw new Error("not used");
    },
    resolvePrincipal: async () => ({ kind: "all" }),
    ...overrides,
  } as CommandContext;
}

describe("assertUsersCommandOptions", () => {
  it("requires --all", () => {
    expect(() =>
      assertUsersCommandOptions(baseCtx({ options: { source: "cur", allPrincipals: false } })),
    ).toThrow("--all");
  });

  it("rejects logs source", () => {
    expect(() =>
      assertUsersCommandOptions(baseCtx({ options: { source: "logs", allPrincipals: true } })),
    ).toThrow("billing data");
  });

  it("rejects principal filters", () => {
    expect(() =>
      assertUsersCommandOptions(
        baseCtx({
          options: { source: "cur", allPrincipals: true, principalArn: "arn:x" },
        }),
      ),
    ).toThrow("does not accept");
  });
});

describe("assertUsersBillingSource", () => {
  it("requires cur", () => {
    expect(() =>
      assertUsersBillingSource({
        resolved: "ce",
        fetchDaily: async () => [],
        fetchWeekly: async () => [],
        fetchMonthly: async () => [],
        fetchModels: async () => [],
        fetchUsers: async () => [],
        fetchBillingFreshness: async () => ({ status: "unknown", latest: null }),
      }),
    ).toThrow("--source cur");
  });
});
