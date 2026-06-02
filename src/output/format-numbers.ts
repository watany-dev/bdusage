export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatEstimateUsd(amount: number): string {
  return `~$${amount.toFixed(2)}`;
}

export function formatTokens(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}k`;
  }
  return String(Math.round(count));
}
