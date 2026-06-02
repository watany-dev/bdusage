import type { EstimateReportMeta, ReportEnvelope, TodayReport } from "../types/report.js";

export function renderJson<T>(envelope: ReportEnvelope<T>): string {
  const payload = {
    version: envelope.meta.version,
    source: envelope.meta.source,
    source_label: envelope.meta.sourceLabel,
    ...(envelope.meta.engine ? { engine: envelope.meta.engine } : {}),
    ...(envelope.meta.engineLabel ? { engine_label: envelope.meta.engineLabel } : {}),
    profile: envelope.meta.profile,
    principal: envelope.meta.principalDisplay,
    period: envelope.meta.period,
    billing_data_status: envelope.meta.billingDataStatus,
    billing_data_latest: envelope.meta.billingDataLatest,
    currency: envelope.meta.currency,
    rows: envelope.rows,
    totals: envelope.totals ?? {},
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function renderTodayJson(meta: EstimateReportMeta, report: TodayReport): string {
  const payload = {
    version: meta.version,
    source: meta.source,
    source_label: meta.sourceLabel,
    profile: meta.profile,
    principal: meta.principalDisplay,
    period: meta.period,
    currency: meta.currency,
    estimate_disclaimer: meta.estimateDisclaimer,
    report,
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}
