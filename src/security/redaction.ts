const REDACT_KEYS = new Set([
  "inputBodyJson",
  "outputBodyJson",
  "inputBody",
  "outputBody",
  "messages",
  "prompt",
]);

export function redactSensitiveFields<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveFields(item)) as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (REDACT_KEYS.has(key)) {
      out[key] = "[redacted]";
      continue;
    }
    out[key] = redactSensitiveFields(child);
  }
  return out as T;
}
