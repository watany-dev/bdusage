import { extractModelSegment } from "./usage-type-parser.js";

const MODEL_ALIASES: Record<string, string> = {
  "Claude-3.5-Sonnet": "Claude 3.5 Sonnet",
  "Claude-3-5-Sonnet": "Claude 3.5 Sonnet",
  "Claude-3-Opus": "Claude 3 Opus",
  "Claude-3-Haiku": "Claude 3 Haiku",
  "Claude-Sonnet": "Claude Sonnet",
  "Nova-Pro": "Amazon Nova Pro",
  "Nova-Lite": "Amazon Nova Lite",
  "Nova-Micro": "Amazon Nova Micro",
};

// Pure function of usageType; real CUR data has low usage-type cardinality, so a
// memo cache avoids re-running the regex chain per aggregated row. Capped defensively.
const NORMALIZE_CACHE_MAX = 10_000;
const normalizeCache = new Map<string, string>();

export function normalizeModelName(usageType: string): string {
  const cached = normalizeCache.get(usageType);
  if (cached !== undefined) {
    return cached;
  }
  const segment = extractModelSegment(usageType);
  const result = MODEL_ALIASES[segment] ?? segment.replace(/-/g, " ").trim();
  if (normalizeCache.size >= NORMALIZE_CACHE_MAX) {
    normalizeCache.clear();
  }
  normalizeCache.set(usageType, result);
  return result;
}

export function pickTopModel(costsByModel: Map<string, number>): string | null {
  let top: string | null = null;
  let max = -1;
  for (const [model, cost] of costsByModel) {
    if (cost > max) {
      max = cost;
      top = model;
    }
  }
  return top;
}
