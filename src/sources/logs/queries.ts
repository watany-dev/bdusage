import { assertSafeLogInsightsQuery, buildAllowedFieldsClause } from "../../security/log-fields.js";
import type { PrincipalFilter } from "../../types/principal.js";
import { logsPrincipalFilterClause } from "./filters.js";

export function buildTodayInsightsQuery(principal: PrincipalFilter): string {
  const principalClause = logsPrincipalFilterClause(principal);
  const fields = buildAllowedFieldsClause();
  const query = `fields ${fields}
| filter schemaType = "ModelInvocationLog"
| filter ${principalClause}
| stats
    count(*) as requests,
    sum(coalesce(input.inputTokenCount, 0)) as input_tokens,
    sum(coalesce(output.outputTokenCount, 0)) as output_tokens,
    sum(coalesce(input.cacheReadInputTokenCount, 0)) as cache_read_tokens,
    sum(coalesce(input.cacheWriteInputTokenCount, 0)) as cache_write_tokens,
    pct(output.outputBodyJson.metrics.latencyMs, 50) as latency_p50,
    pct(output.outputBodyJson.metrics.latencyMs, 95) as latency_p95
  by modelId`;
  assertSafeLogInsightsQuery(query);
  return query;
}
