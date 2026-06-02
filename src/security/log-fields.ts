/** Fields allowed in CloudWatch Logs Insights queries (no prompt/response bodies). */
const ALLOWED_LOG_INSIGHTS_FIELDS = [
  "@timestamp",
  "schemaType",
  "modelId",
  "identity.arn",
  "input.inputTokenCount",
  "output.outputTokenCount",
  "input.cacheReadInputTokenCount",
  "input.cacheWriteInputTokenCount",
  "output.outputBodyJson.metrics.latencyMs",
] as const;

const FORBIDDEN_FIELD_PATTERNS = [
  /input\.inputBodyJson/i,
  /output\.outputBodyJson(?!\.metrics\.)/i,
  /\binputBody\b/i,
  /\boutputBody\b/i,
  /\bprompt\b/i,
  /\bmessages\b/i,
] as const;

export function assertSafeLogInsightsQuery(query: string): void {
  for (const pattern of FORBIDDEN_FIELD_PATTERNS) {
    if (pattern.test(query)) {
      throw new Error(
        "Log query must not reference prompt or response body fields. See docs/SPEC.md §20.2.",
      );
    }
  }
}

export function buildAllowedFieldsClause(): string {
  return ALLOWED_LOG_INSIGHTS_FIELDS.join(", ");
}
