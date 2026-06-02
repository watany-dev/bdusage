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

export function normalizeModelName(usageType: string): string {
  const segment = extractModelSegment(usageType);
  if (MODEL_ALIASES[segment]) {
    return MODEL_ALIASES[segment];
  }
  return segment.replace(/-/g, " ").trim();
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
