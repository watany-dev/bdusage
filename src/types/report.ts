import type { PrincipalFilter } from "./principal.js";
import type { ResolvedSourceName } from "./source.js";

export type CostMetric = "unblended" | "net_unblended";

export type OutputFormat = "table" | "json" | "csv";

export type BillingDataStatus = "complete" | "partial" | "unknown";

export interface ReportMeta {
  version: string;
  source: ResolvedSourceName;
  sourceLabel: string;
  profile: string;
  region: string;
  principal: PrincipalFilter;
  principalDisplay: string;
  period: { since: string; until: string };
  billingDataStatus: BillingDataStatus;
  billingDataLatest: string | null;
  currency: string;
}

export interface TokenTotals {
  input: number;
  output: number;
  cache_read: number;
  cache_write: number;
}

export interface DailyRow {
  date: string;
  cost: number;
  tokens: TokenTotals;
  top_model: string | null;
}

export interface MonthlyRow {
  month: string;
  cost: number;
  tokens: TokenTotals;
  top_model: string | null;
}

export interface ModelRow {
  model: string;
  cost: number;
  tokens: TokenTotals;
  usage_types: string[];
}

export interface SummaryTotals {
  this_month: number;
  yesterday: number;
  top_model: string | null;
  top_driver: string | null;
}

export interface ReportEnvelope<T> {
  meta: ReportMeta;
  rows: T[];
  totals?: Record<string, unknown>;
}
