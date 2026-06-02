import { describe, expect, it, vi } from "vitest";
import type { CommandContext } from "../cli/context.js";
import { DEFAULT_CONFIG } from "../config/schema.js";
import { runWhoami } from "./whoami.js";

vi.mock("../aws/sts.js", () => ({
  getCallerIdentity: vi.fn().mockResolvedValue({
    account: "123",
    arn: "arn:aws:sts::123:assumed-role/R/u",
    userId: "A",
  }),
}));

describe("runWhoami", () => {
  it("prints identity and config", async () => {
    const ctx = {
      version: "bdusage v0.1.0",
      configPath: "/tmp/c.toml",
      config: { ...DEFAULT_CONFIG, aws: { profile: "p", region: "r" } },
      resolvePrincipal: vi.fn().mockResolvedValue({ kind: "self", arn: "arn:1" }),
    } as CommandContext;
    const out = await runWhoami(ctx);
    expect(out).toContain("caller arn:");
    expect(out).toContain("/tmp/c.toml");
  });
});
