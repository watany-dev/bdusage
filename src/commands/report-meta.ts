import type { CommandContext } from "../cli/context.js";
import type { PrincipalFilter } from "../types/principal.js";
import { formatPrincipalFilter } from "../types/principal.js";
import type { EstimateReportMeta, ReportMeta } from "../types/report.js";
import { resolveSourceLabel } from "../types/source.js";
import type { DateRange } from "../util/dates.js";

const ESTIMATE_DISCLAIMER = "estimated cost, not billing data";

export function buildReportMeta(
  ctx: CommandContext,
  principal: PrincipalFilter,
  range: DateRange,
  billing?: { status: ReportMeta["billingDataStatus"]; latest: string | null },
): ReportMeta {
  const source = ctx.resolvedSource ?? (ctx.options.source === "ce" ? "ce" : "cur");
  return {
    version: ctx.version,
    source,
    sourceLabel: resolveSourceLabel(source),
    profile: ctx.config.aws.profile ?? "default",
    region: ctx.config.aws.region ?? "us-east-1",
    principal,
    principalDisplay: formatPrincipalFilter(principal),
    period: { since: range.since, until: addExclusiveEnd(range.until) },
    billingDataStatus: billing?.status ?? "unknown",
    billingDataLatest: billing?.latest ?? null,
    currency: ctx.config.output.currency,
  };
}

export function buildEstimateReportMeta(
  ctx: CommandContext,
  principal: PrincipalFilter,
  range: DateRange,
): EstimateReportMeta {
  return {
    version: ctx.version,
    source: "logs",
    sourceLabel: resolveSourceLabel("logs"),
    profile: ctx.config.aws.profile ?? "default",
    region: ctx.config.aws.region ?? "us-east-1",
    principal,
    principalDisplay: formatPrincipalFilter(principal),
    period: { since: range.since, until: range.since },
    currency: ctx.config.output.currency,
    estimateDisclaimer: ESTIMATE_DISCLAIMER,
  };
}

/** Display until as inclusive end date (SQL uses exclusive end). */
function addExclusiveEnd(untilExclusive: string): string {
  const d = new Date(`${untilExclusive}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
