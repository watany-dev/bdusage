import { describe, expect, it, vi } from "vitest";
import type { CommandContext } from "../cli/context.js";
import { DEFAULT_CONFIG } from "../config/schema.js";
import { runWeekly } from "./weekly.js";

function mockCtx(overrides: Partial<CommandContext> = {}): CommandContext {
  const billing = {
    resolved: "cur" as const,
    fetchDaily: vi.fn(),
    fetchWeekly: vi.fn().mockResolvedValue([
      {
        week_start: "2026-06-01",
        week_end: "2026-06-07",
        cost: 3,
        tokens: { input: 0, output: 0, cache_read: 0, cache_write: 0 },
        top_model: null,
      },
    ]),
    fetchMonthly: vi.fn(),
    fetchModels: vi.fn(),
    fetchUsers: vi.fn(),
    fetchBillingFreshness: vi.fn().mockResolvedValue({ status: "partial", latest: "2026-06-01" }),
  };
  return {
    version: "bdusage v0.1.0-beta.0",
    configPath: "/tmp/config.toml",
    config: DEFAULT_CONFIG,
    options: { source: "cur" },
    outputFormat: "table",
    resolvedSource: "cur",
    createCurSource: vi.fn(),
    createBillingSource: vi.fn().mockResolvedValue(billing),
    resolvePrincipal: vi.fn().mockResolvedValue({ kind: "self", arn: "arn:1" }),
    ...overrides,
  } as CommandContext;
}

describe("runWeekly", () => {
  it.each(["table", "json", "csv"] as const)("renders %s", async (format) => {
    const out = await runWeekly(mockCtx({ outputFormat: format }));
    expect(out.length).toBeGreaterThan(5);
  });
});
