/**
 * Error Tracking & Incident Response — Fingerprinting (MS-56)
 * Stable grouping key for aggregation. Variable payloads (UUIDs, numbers,
 * quoted strings, URLs, path segments) are normalized so repeated occurrences
 * of the same defect collapse into a single aggregated error record.
 */

import { createHash } from 'node:crypto';
import type { ErrorClass, ErrorSource } from '../domain/entities.js';

export function normalizeFingerprintMessage(message: string): string {
  return message
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '{uuid}')
    .replace(/https?:\/\/[^\s]+/gi, '{url}')
    .replace(/["'`][^"'`]*["'`]/g, '{str}')
    .replace(/\b\d+(?:\.\d+)*\b/g, '{n}')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function computeFingerprint(input: {
  errorClass: ErrorClass;
  source: ErrorSource;
  name: string;
  message: string;
}): string {
  const normalizedName = input.name.trim().toLowerCase() || 'error';
  const normalizedMessage = normalizeFingerprintMessage(input.message) || 'no-message';
  const canonical = `${input.errorClass}|${input.source}|${normalizedName}|${normalizedMessage}`;
  return createHash('sha1').update(canonical).digest('hex');
}
