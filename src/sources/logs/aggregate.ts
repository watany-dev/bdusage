import type { LogInsightsRow } from "../../aws/cloudwatch-logs.js";
import { normalizeModelId } from "../../bedrock/model-id-normalizer.js";
import { pickTopModel } from "../../bedrock/model-normalizer.js";
import type { LatencyPercentiles, TodayReport, TokenTotals } from "../../types/report.js";

interface ModelUsageRow {
  modelId: string;
  model: string;
  requests: number;
  tokens: TokenTotals;
  latency_ms: LatencyPercentiles;
}

export function parseModelUsageRows(rows: LogInsightsRow[]): ModelUsageRow[] {
  return rows
    .filter((row) => row["modelId"])
    .map((row) => ({
      modelId: row["modelId"] ?? "unknown",
      model: normalizeModelId(row["modelId"] ?? "unknown"),
      requests: parseIntField(row["requests"]),
      tokens: {
        input: parseIntField(row["input_tokens"]),
        output: parseIntField(row["output_tokens"]),
        cache_read: parseIntField(row["cache_read_tokens"]),
        cache_write: parseIntField(row["cache_write_tokens"]),
      },
      latency_ms: {
        p50: parseFloatField(row["latency_p50"]),
        p95: parseFloatField(row["latency_p95"]),
      },
    }));
}

export function aggregateTodayReport(
  modelRows: ModelUsageRow[],
  estimatedCost: number | null,
): TodayReport {
  const totals: TokenTotals = {
    input: 0,
    output: 0,
    cache_read: 0,
    cache_write: 0,
  };
  let requests = 0;
  const latencies: number[] = [];
  const costByModel = new Map<string, number>();

  for (const row of modelRows) {
    requests += row.requests;
    totals.input += row.tokens.input;
    totals.output += row.tokens.output;
    totals.cache_read += row.tokens.cache_read;
    totals.cache_write += row.tokens.cache_write;
    if (row.latency_ms.p50 !== null) {
      latencies.push(row.latency_ms.p50);
    }
    costByModel.set(
      row.model,
      row.tokens.input + row.tokens.output + row.tokens.cache_read + row.tokens.cache_write,
    );
  }

  return {
    requests,
    tokens: totals,
    latency_ms: aggregateLatency(modelRows),
    estimated_cost: estimatedCost,
    top_model: pickTopModel(costByModel),
  };
}

function aggregateLatency(rows: ModelUsageRow[]): LatencyPercentiles {
  const p50Values = rows.map((r) => r.latency_ms.p50).filter((v): v is number => v !== null);
  const p95Values = rows.map((r) => r.latency_ms.p95).filter((v): v is number => v !== null);
  return {
    p50: p50Values.length > 0 ? average(p50Values) : null,
    p95: p95Values.length > 0 ? Math.max(...p95Values) : null,
  };
}

function average(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function parseIntField(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function parseFloatField(value: string | undefined): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
