import { describe, expect, it, vi } from "vitest";
import type { CommandContext } from "../cli/context.js";
import { DEFAULT_CONFIG } from "../config/schema.js";
import { runModels } from "./models.js";

describe("runModels", () => {
  it("renders all formats", async () => {
    for (const format of ["table", "json", "csv"] as const) {
      const billing = {
        resolved: "cur" as const,
        fetchDaily: vi.fn(),
        fetchWeekly: vi.fn(),
        fetchMonthly: vi.fn(),
        fetchUsers: vi.fn(),
        fetchModels: vi.fn().mockResolvedValue([
          {
            model: "Claude",
            cost: 2,
            tokens: { input: 1, output: 2, cache_read: 3, cache_write: 4 },
            usage_types: ["T"],
          },
        ]),
        fetchBillingFreshness: vi.fn().mockResolvedValue({ status: "unknown", latest: null }),
      };
      const ctx = {
        version: "bdusage v0.1.0",
        configPath: "/tmp/c.toml",
        config: DEFAULT_CONFIG,
        options: { source: "cur" },
        outputFormat: format,
        resolvedSource: "cur",
        createCurSource: vi.fn(),
        createBillingSource: vi.fn().mockResolvedValue(billing),
        resolvePrincipal: vi.fn().mockResolvedValue({ kind: "arn", arn: "arn:1" }),
      } as CommandContext;
      const out = await runModels(ctx);
      expect(out).toContain(format === "json" ? '"rows"' : "Claude");
    }
  });
});
