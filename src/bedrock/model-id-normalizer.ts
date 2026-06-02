export function normalizeModelId(modelId: string): string {
  const base = modelId.split(":")[0] ?? modelId;
  const vendor = base.includes(".") ? (base.split(".")[0] ?? "") : "";
  const name = base.includes(".") ? base.slice(base.indexOf(".") + 1) : base;
  const pretty = name.replace(/-/g, " ").replace(/\d{8}/g, "").replace(/\s+/g, " ").trim();
  if (!pretty) {
    return modelId;
  }
  if (vendor === "anthropic") {
    return `Claude ${capitalizeWords(pretty)}`;
  }
  if (vendor === "amazon") {
    return `Amazon ${capitalizeWords(pretty)}`;
  }
  return capitalizeWords(pretty);
}

function capitalizeWords(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
