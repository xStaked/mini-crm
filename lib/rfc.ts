export function normalizeRfc(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().trim();
}

export function isLikelyValidRfc(value: string): boolean {
  const normalized = normalizeRfc(value);
  return normalized.length >= 12 && normalized.length <= 13;
}
