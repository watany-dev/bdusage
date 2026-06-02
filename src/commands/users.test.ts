import { describe, expect, it, vi } from "vitest";
import type { CommandContext } from "../cli/context.js";
import { DEFAULT_CONFIG } from "../config/schema.js";
import { runUsers } from "./users.js";

function mockCtx(overrides: Partial<CommandContext> = {}): CommandContext {
  const billing = {
    resolved: "cur" as const,
    fetchDaily: vi.fn(),
    fetchWeekly: vi.fn(),
    fetchMonthly: vi.fn(),
    fetchModels: vi.fn(),
    fetchUsers: vi.fn().mockResolvedValue([
      {
        principal: "arn:aws:sts::1:assumed-role/Dev/alice",
        cost: 9,
        tokens: { input: 1, output: 2, cache_read: 0, cache_write: 0 },
        top_model: "Claude",
      },
    ]),
    fetchBillingFreshness: vi.fn().mockResolvedValue({ status: "partial", latest: "2026-06-01" }),
  };
  return {
    version: "bdusage v0.3.0",
    configPath: "/tmp/config.toml",
    config: DEFAULT_CONFIG,
    options: { source: "cur", allPrincipals: true },
    outputFormat: "table",
    resolvedSource: "cur",
    createCurSource: vi.fn(),
    createBillingSource: vi.fn().mockResolvedValue(billing),
    resolvePrincipal: vi.fn(),
    ...overrides,
  } as CommandContext;
}

describe("runUsers", () => {
  it.each(["table", "json", "csv"] as const)("renders %s with --all", async (format) => {
    const out = await runUsers(mockCtx({ outputFormat: format }));
    expect(out).toContain("Dev/alice");
  });

  it("rejects without --all", async () => {
    await expect(
      runUsers(mockCtx({ options: { source: "cur", allPrincipals: false } })),
    ).rejects.toThrow("--all");
  });
});
