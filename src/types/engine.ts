export const CUR_ENGINE_NAMES = ["auto", "duckdb", "athena"] as const;

export type CurEngineName = (typeof CUR_ENGINE_NAMES)[number];

/** CUR backend that actually ran the query (auto resolves to duckdb or athena). */
export type ResolvedCurEngine = "duckdb" | "athena";

const ENGINE_LABELS: Record<ResolvedCurEngine, string> = {
  duckdb: "DuckDB direct Parquet",
  athena: "Athena",
};

export function resolveCurEngineLabel(engine: ResolvedCurEngine): string {
  return ENGINE_LABELS[engine];
}

export function isCurEngineName(value: string): value is CurEngineName {
  return (CUR_ENGINE_NAMES as readonly string[]).includes(value);
}
