import { describe, expect, it, vi } from "vitest";
import type { CommandContext } from "../cli/context.js";
import { DEFAULT_CONFIG } from "../config/schema.js";
import { runDaily } from "./daily.js";

function mockCtx(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    version: "bdusage v0.1.0",
    configPath: "/tmp/config.toml",
    config: DEFAULT_CONFIG,
    options: { source: "cur" },
    outputFormat: "table",
    createCurSource: () =>
      ({
        fetchDaily: vi.fn().mockResolvedValue([
          {
            date: "2026-06-01",
            cost: 1,
            tokens: { input: 0, output: 0, cache_read: 0, cache_write: 0 },
            top_model: null,
          },
        ]),
        fetchBillingFreshness: vi
          .fn()
          .mockResolvedValue({ status: "partial", latest: "2026-06-01" }),
      }) as ReturnType<CommandContext["createCurSource"]>,
    resolvePrincipal: vi.fn().mockResolvedValue({ kind: "self", arn: "arn:1" }),
    ...overrides,
  } as CommandContext;
}

describe("runDaily", () => {
  it.each(["table", "json", "csv"] as const)("renders %s", async (format) => {
    const out = await runDaily(mockCtx({ outputFormat: format }));
    expect(out.length).toBeGreaterThan(5);
  });
});
