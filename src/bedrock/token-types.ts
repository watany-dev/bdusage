type TokenKind = "input" | "output" | "cache_read" | "cache_write" | "other";

const INPUT_PATTERNS = [/Input-Tokens/i, /InputToken/i];
const OUTPUT_PATTERNS = [/Output-Tokens/i, /OutputToken/i];
const CACHE_READ_PATTERNS = [/Cache-Read/i, /CacheRead/i, /Prompt-Cache-Read/i];
const CACHE_WRITE_PATTERNS = [/Cache-Write/i, /CacheWrite/i, /Prompt-Cache-Write/i];

export function classifyUsageType(usageType: string): TokenKind {
  if (CACHE_READ_PATTERNS.some((p) => p.test(usageType))) {
    return "cache_read";
  }
  if (CACHE_WRITE_PATTERNS.some((p) => p.test(usageType))) {
    return "cache_write";
  }
  if (INPUT_PATTERNS.some((p) => p.test(usageType))) {
    return "input";
  }
  if (OUTPUT_PATTERNS.some((p) => p.test(usageType))) {
    return "output";
  }
  return "other";
}

export function emptyTokenTotals(): {
  input: number;
  output: number;
  cache_read: number;
  cache_write: number;
} {
  return { input: 0, output: 0, cache_read: 0, cache_write: 0 };
}

export function addUsageAmount(
  totals: ReturnType<typeof emptyTokenTotals>,
  usageType: string,
  amount: number,
): void {
  const kind = classifyUsageType(usageType);
  switch (kind) {
    case "input":
      totals.input += amount;
      break;
    case "output":
      totals.output += amount;
      break;
    case "cache_read":
      totals.cache_read += amount;
      break;
    case "cache_write":
      totals.cache_write += amount;
      break;
    case "other":
      break;
  }
}
