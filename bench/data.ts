/** Synthetic CUR-like data for benchmarks. Deterministic (seeded) so runs are comparable. */

export interface BenchRawUsageRow {
  usage_date?: string;
  usage_month?: string;
  week_start?: string;
  principal?: string;
  usage_type: string;
  cost: number;
  usage_amount: number;
}

export const REALISTIC_USAGE_TYPES: string[] = [
  "USE1-Claude-3-5-Sonnet-Input-Tokens",
  "USE1-Claude-3-5-Sonnet-Output-Tokens",
  "USE1-Claude-3-5-Sonnet-Cache-Read-Tokens",
  "USE1-Claude-3-5-Sonnet-Cache-Write-Tokens",
  "USE1-Claude-3-Opus-Input-Tokens",
  "USE1-Claude-3-Opus-Output-Tokens",
  "USE1-Claude-3-Haiku-Input-Tokens",
  "USE1-Claude-3-Haiku-Output-Tokens",
  "APN1-Claude-3-Haiku-Cache-Read-Tokens",
  "APN1-Claude-3-Haiku-Cache-Write-Tokens",
  "APN1-Claude-Sonnet-Input-Tokens",
  "APN1-Claude-Sonnet-Output-Tokens",
  "EUW1-Nova-Pro-InputToken",
  "EUW1-Nova-Pro-OutputToken",
  "EUW1-Nova-Lite-InputToken",
  "EUW1-Nova-Lite-OutputToken",
  "USW2-Nova-Micro-Input-Tokens",
  "USW2-Nova-Micro-Output-Tokens",
  "USE1-Titan-Text-Express-Input-Tokens",
  "USE1-ModelInference-SomethingElse",
];

/** Mulberry32 PRNG — deterministic across runs. */
function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isoDate(daysAfterStart: number): string {
  const base = Date.UTC(2026, 0, 1);
  return new Date(base + daysAfterStart * 86_400_000).toISOString().slice(0, 10);
}

/** Emit days × usage types × principals rows shaped like RawUsageRow. */
export function makeRawRows(opts: { days: number; principals: number }): BenchRawUsageRow[] {
  const rng = makeRng(42);
  const rows: BenchRawUsageRow[] = [];
  for (let day = 0; day < opts.days; day++) {
    const date = isoDate(day);
    const month = date.slice(0, 7);
    for (let p = 0; p < opts.principals; p++) {
      for (const usageType of REALISTIC_USAGE_TYPES) {
        rows.push({
          usage_date: date,
          usage_month: month,
          principal: `arn:aws:sts::123456789012:assumed-role/dev/user-${p}`,
          usage_type: usageType,
          cost: rng() * 10,
          usage_amount: Math.floor(rng() * 1_000_000),
        });
      }
    }
  }
  return rows;
}

/** String-valued rows as returned by the Athena result parser, for athenaRowsToRaw. */
export function makeAthenaStringRows(count: number): Array<Record<string, string | null>> {
  const rng = makeRng(7);
  const rows: Array<Record<string, string | null>> = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      usage_date: isoDate(i % 90),
      usage_type: REALISTIC_USAGE_TYPES[i % REALISTIC_USAGE_TYPES.length] ?? "",
      cost: (rng() * 10).toFixed(6),
      usage_amount: String(Math.floor(rng() * 1_000_000)),
      principal: `arn:aws:sts::123456789012:assumed-role/dev/user-${i % 50}`,
    });
  }
  return rows;
}
