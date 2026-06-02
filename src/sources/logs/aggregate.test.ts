import { describe, expect, it } from "vitest";
import { aggregateTodayReport, parseModelUsageRows } from "./aggregate.js";

describe("logs aggregate", () => {
  it("parses model stats rows", () => {
    const rows = parseModelUsageRows([
      {
        modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
        requests: "3",
        input_tokens: "100",
        output_tokens: "50",
        cache_read_tokens: "0",
        cache_write_tokens: "0",
        latency_p50: "120",
        latency_p95: "200",
      },
    ]);
    expect(rows[0]?.requests).toBe(3);
    expect(rows[0]?.tokens.input).toBe(100);
  });

  it("aggregates today report", () => {
    const report = aggregateTodayReport(
      parseModelUsageRows([
        {
          modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
          requests: "2",
          input_tokens: "10",
          output_tokens: "5",
        },
      ]),
      0.42,
    );
    expect(report.requests).toBe(2);
    expect(report.estimated_cost).toBe(0.42);
    expect(report.top_model).toBeTruthy();
  });
});
