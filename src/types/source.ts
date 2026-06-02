export const SOURCE_NAMES = ["cur", "ce", "auto"] as const;

export type SourceName = (typeof SOURCE_NAMES)[number];

/** Source that actually produced the report (auto resolves to cur or ce). */
export type ResolvedSourceName = "cur" | "ce";

const SOURCE_LABELS: Record<ResolvedSourceName, string> = {
  cur: "CUR 2.0 actual",
  ce: "Cost Explorer actual-lite",
};

export function resolveSourceLabel(source: ResolvedSourceName): string {
  return SOURCE_LABELS[source];
}

export function isSourceName(value: string): value is SourceName {
  return (SOURCE_NAMES as readonly string[]).includes(value);
}
