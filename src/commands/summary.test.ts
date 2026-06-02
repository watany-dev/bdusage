import { describe, expect, it, vi } from "vitest";
import type { CommandContext } from "../cli/context.js";
import { DEFAULT_CONFIG } from "../config/schema.js";
import { runSummary } from "./summary.js";

describe("runSummary", () => {
  it("renders summary table and json", async () => {
    const source = {
      fetchMonthly: vi.fn().mockResolvedValue([
        {
          month: "2026-06",
          cost: 10,
          tokens: { input: 0, output: 0, cache_read: 0, cache_write: 0 },
          top_model: "Claude",
        },
      ]),
      fetchDaily: vi.fn().mockResolvedValue([
        {
          date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
          cost: 3,
          tokens: { input: 0, output: 0, cache_read: 0, cache_write: 0 },
          top_model: "Claude",
        },
      ]),
      fetchBillingFreshness: vi.fn().mockResolvedValue({ status: "partial", latest: "2026-06-01" }),
      fetchModels: vi.fn().mockResolvedValue([
        {
          model: "Claude",
          cost: 5,
          tokens: { input: 0, output: 0, cache_read: 0, cache_write: 0 },
          usage_types: ["USE1-Claude-Output-Tokens"],
        },
      ]),
    };

    const base = {
      version: "bdusage v0.1.0",
      configPath: "/tmp/c.toml",
      config: DEFAULT_CONFIG,
      options: { source: "cur" as const },
      createCurSource: () => source as ReturnType<CommandContext["createCurSource"]>,
      resolvePrincipal: vi.fn().mockResolvedValue({ kind: "self", arn: "arn:1" }),
    };

    const table = await runSummary({ ...base, outputFormat: "table" } as CommandContext);
    expect(table).toContain("This month:");

    const json = await runSummary({ ...base, outputFormat: "json" } as CommandContext);
    expect(JSON.parse(json)).toHaveProperty("totals");
  });
});
