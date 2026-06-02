import { describe, expect, it, vi } from "vitest";
import type { CommandContext } from "../cli/context.js";
import { DEFAULT_CONFIG } from "../config/schema.js";
import { runMonthly } from "./monthly.js";

function mockCtx(format: CommandContext["outputFormat"]): CommandContext {
  const billing = {
    resolved: "cur" as const,
    fetchDaily: vi.fn(),
    fetchMonthly: vi.fn().mockResolvedValue([
      {
        month: "2026-06",
        cost: 1,
        tokens: { input: 0, output: 0, cache_read: 0, cache_write: 0 },
        top_model: "M",
      },
    ]),
    fetchModels: vi.fn(),
    fetchBillingFreshness: vi.fn().mockResolvedValue({ status: "partial", latest: "2026-06-01" }),
  };
  return {
    version: "bdusage v0.1.0",
    configPath: "/tmp/c.toml",
    config: DEFAULT_CONFIG,
    options: { source: "cur", since: "2026-01-01" },
    outputFormat: format,
    resolvedSource: "cur",
    createCurSource: vi.fn(),
    createBillingSource: vi.fn().mockResolvedValue(billing),
    resolvePrincipal: vi.fn().mockResolvedValue({ kind: "all" }),
  } as CommandContext;
}

describe("runMonthly", () => {
  it.each(["table", "json", "csv"] as const)("renders %s", async (format) => {
    const out = await runMonthly(mockCtx(format));
    expect(out.length).toBeGreaterThan(10);
  });
});
