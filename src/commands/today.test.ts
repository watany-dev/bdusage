import { describe, expect, it, vi } from "vitest";
import { runToday } from "./today.js";

describe("runToday", () => {
  it("requires logs source", async () => {
    const ctx = {
      options: { source: "auto" },
      outputFormat: "table",
      createEstimateSource: vi.fn(),
      resolvePrincipal: vi.fn(),
    } as never;
    await expect(runToday(ctx)).rejects.toThrow("today requires --source logs");
  });

  it("renders table report", async () => {
    const ctx = {
      options: { source: "logs" },
      outputFormat: "table",
      version: "bdusage v0.1.0-beta.0",
      config: { aws: { profile: "p", region: "us-east-1" }, output: { currency: "USD" } },
      createEstimateSource: vi.fn().mockResolvedValue({
        fetchToday: vi.fn().mockResolvedValue({
          requests: 1,
          tokens: { input: 10, output: 5, cache_read: 0, cache_write: 0 },
          latency_ms: { p50: 100, p95: 200 },
          estimated_cost: 0.5,
          top_model: "Claude",
        }),
      }),
      resolvePrincipal: vi.fn().mockResolvedValue({
        kind: "self",
        arn: "arn:aws:sts::1:assumed-role/R/u",
      }),
    } as never;
    const out = await runToday(ctx);
    expect(out).toContain("CloudWatch Logs estimate");
    expect(out).toContain("~$0.50");
  });

  it("renders json report", async () => {
    const ctx = {
      options: { source: "logs" },
      outputFormat: "json",
      version: "bdusage v0.1.0-beta.0",
      config: { aws: { profile: "p", region: "us-east-1" }, output: { currency: "USD" } },
      createEstimateSource: vi.fn().mockResolvedValue({
        fetchToday: vi.fn().mockResolvedValue({
          requests: 0,
          tokens: { input: 0, output: 0, cache_read: 0, cache_write: 0 },
          latency_ms: { p50: null, p95: null },
          estimated_cost: null,
          top_model: null,
        }),
      }),
      resolvePrincipal: vi.fn().mockResolvedValue({ kind: "all" }),
    } as never;
    const out = await runToday(ctx);
    expect(JSON.parse(out)).toMatchObject({ source: "logs" });
  });

  it("rejects csv output", async () => {
    const ctx = {
      options: { source: "logs" },
      outputFormat: "csv",
      version: "bdusage v0.1.0-beta.0",
      config: { aws: { profile: "p", region: "us-east-1" }, output: { currency: "USD" } },
      createEstimateSource: vi.fn().mockResolvedValue({
        fetchToday: vi.fn().mockResolvedValue({
          requests: 0,
          tokens: { input: 0, output: 0, cache_read: 0, cache_write: 0 },
          latency_ms: { p50: null, p95: null },
          estimated_cost: null,
          top_model: null,
        }),
      }),
      resolvePrincipal: vi.fn().mockResolvedValue({ kind: "all" }),
    } as never;
    await expect(runToday(ctx)).rejects.toThrow("CSV output");
  });
});
