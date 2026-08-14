/**
 * Safe internal redirects — prevents open-redirect attacks.
 * Only same-origin absolute paths are allowed: must start with a single `/`,
 * must not contain `//`, `\`, or a URI scheme (`http:`, `javascript:`, ...).
 */
export function sanitizeInternalPath(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (value.includes('\\')) return fallback;
  if (value.slice(1).includes('://')) return fallback;
  return value;
}