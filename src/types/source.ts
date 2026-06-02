export const V01_SOURCES = ["cur", "auto"] as const;

export type V01SourceName = (typeof V01_SOURCES)[number];

const SOURCE_LABELS: Record<V01SourceName, string> = {
  cur: "CUR 2.0 actual",
  auto: "CUR 2.0 actual",
};

export function resolveSourceLabel(source: V01SourceName): string {
  return SOURCE_LABELS[source];
}

export function isV01Source(value: string): value is V01SourceName {
  return (V01_SOURCES as readonly string[]).includes(value);
}
