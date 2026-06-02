import { describe, expect, it } from "vitest";
import type { CommandContext } from "../cli/context.js";
import { DEFAULT_CONFIG } from "../config/schema.js";
import { buildReportMeta } from "./report-meta.js";

const ctx = {
  version: "bdusage v0.1.0",
  options: { source: "cur" as const },
  config: { ...DEFAULT_CONFIG, aws: { profile: "p", region: "r" } },
} as CommandContext;

describe("buildReportMeta", () => {
  it("builds meta with source label", () => {
    const meta = buildReportMeta(
      ctx,
      { kind: "self", arn: "arn:1" },
      { since: "2026-06-01", until: "2026-06-03" },
      { status: "partial", latest: "2026-06-01" },
    );
    expect(meta.sourceLabel).toBe("CUR 2.0 actual");
    expect(meta.period.until).toBe("2026-06-02");
  });
});
