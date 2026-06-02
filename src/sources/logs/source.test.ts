import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "../../config/schema.js";
import { LogsSource } from "./source.js";

describe("LogsSource", () => {
  const config = {
    ...DEFAULT_CONFIG,
    logs: { log_group: "/aws/bedrock/modelinvocations" },
  };

  it("fetchToday aggregates insights and pricing", async () => {
    const logsClient = {
      runInsightsQuery: vi.fn().mockResolvedValue([
        {
          modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
          requests: "1",
          input_tokens: "1000",
          output_tokens: "200",
          cache_read_tokens: "0",
          cache_write_tokens: "0",
          latency_p50: "50",
          latency_p95: "90",
        },
      ]),
    };
    const pricing = {
      getModelRates: vi.fn().mockResolvedValue({
        inputPerToken: 0.000003,
        outputPerToken: 0.000015,
        cacheReadPerToken: 0,
        cacheWritePerToken: 0,
      }),
    };
    const source = new LogsSource(logsClient, pricing, config);
    const report = await source.fetchToday(
      { kind: "self", arn: "arn:aws:sts::1:assumed-role/R/u" },
      { since: "2026-06-02", until: "2026-06-03" },
    );
    expect(report.requests).toBe(1);
    expect(report.estimated_cost).toBeCloseTo(0.003 + 0.003);
    expect(logsClient.runInsightsQuery).toHaveBeenCalled();
  });

  it("returns null estimated cost when pricing unavailable", async () => {
    const logsClient = {
      runInsightsQuery: vi.fn().mockResolvedValue([
        {
          modelId: "unknown-model",
          requests: "1",
          input_tokens: "10",
          output_tokens: "5",
        },
      ]),
    };
    const source = new LogsSource(
      logsClient,
      { getModelRates: vi.fn().mockResolvedValue(null) },
      config,
    );
    const report = await source.fetchToday(
      { kind: "all" },
      { since: "2026-06-02", until: "2026-06-03" },
    );
    expect(report.estimated_cost).toBeNull();
  });

  it("probe runs minimal insights query", async () => {
    const logsClient = {
      runInsightsQuery: vi.fn().mockResolvedValue([]),
    };
    const source = new LogsSource(logsClient, { getModelRates: vi.fn() }, config);
    await source.probe();
    expect(logsClient.runInsightsQuery).toHaveBeenCalled();
  });

  it("requires log_group in config", async () => {
    const source = new LogsSource(
      { runInsightsQuery: vi.fn() },
      { getModelRates: vi.fn() },
      DEFAULT_CONFIG,
    );
    await expect(
      source.fetchToday({ kind: "all" }, { since: "2026-06-02", until: "2026-06-03" }),
    ).rejects.toThrow("logs.log_group");
  });
});
