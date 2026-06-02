import type { BillingDataStatus } from "../../types/report.js";

export interface BillingFreshness {
  status: BillingDataStatus;
  latest: string | null;
}

export function parseBillingFreshnessFromRows(
  rows: Array<Record<string, string | null>>,
): BillingFreshness {
  const latest = rows.find((row) => row["latest_usage"])?.["latest_usage"] ?? null;
  if (!latest) {
    return { status: "unknown", latest: null };
  }
  return { status: "partial", latest };
}

export function athenaRowsToRawWithoutLatest(
  rows: Array<Record<string, string | null>>,
): Array<Record<string, string | null>> {
  return rows.map((row) => {
    const { latest_usage: _latest, ...rest } = row;
    return rest;
  });
}
