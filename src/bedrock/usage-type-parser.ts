/** Strip region prefix (e.g. USE1-) from CUR usage type. */
function stripRegionPrefix(usageType: string): string {
  return usageType.replace(/^[A-Z]{2,4}\d*-/i, "");
}

export function extractModelSegment(usageType: string): string {
  const stripped = stripRegionPrefix(usageType);
  const withoutSuffix = stripped
    .replace(/-Input-Tokens$/i, "")
    .replace(/-Output-Tokens$/i, "")
    .replace(/-Cache-Read-Tokens$/i, "")
    .replace(/-Cache-Write-Tokens$/i, "")
    .replace(/-InputToken$/i, "")
    .replace(/-OutputToken$/i, "");
  return withoutSuffix;
}
