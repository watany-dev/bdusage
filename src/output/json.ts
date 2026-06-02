import type { ReportEnvelope } from "../types/report.js";

export function renderJson<T>(envelope: ReportEnvelope<T>): string {
  const payload = {
    version: envelope.meta.version,
    source: envelope.meta.source,
    source_label: envelope.meta.sourceLabel,
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
