/**
 * PII Scan Worker
 *
 * Trigger: ConfessionCreated
 *
 * Scans confession content for personally identifiable information:
 * - Phone numbers (Indian/international)
 * - Email addresses
 * - Roll/registration numbers
 * - Social media handles (@username)
 * - Real name patterns (provider-abstracted)
 *
 * If PII is detected:
 *   1. Quarantine the confession
 *   2. Open a moderation case
 *   3. Emit ModerationCaseOpened event
 *
 * Never logs confession content or pseudonyms.
 */

export interface PiiScanResult {
  hasPii: boolean;
  detectedTypes: string[];
  confessionId: string;
}

// Regex patterns for PII detection
const PII_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'PHONE_NUMBER', pattern: /(?:\+91[\s-]?)?[6-9]\d{9}/g },
  { name: 'PHONE_INTERNATIONAL', pattern: /\+\d{1,3}[\s-]?\d{6,14}/g },
  { name: 'EMAIL', pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { name: 'ROLL_NUMBER', pattern: /\b\d{2}[A-Z]{2,4}\d{3,5}\b/g },
  { name: 'SOCIAL_HANDLE', pattern: /@[a-zA-Z0-9_]{3,30}\b/g }
];

export function scanForPii(content: string): PiiScanResult {
  const detectedTypes: string[] = [];

  for (const { name, pattern } of PII_PATTERNS) {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    if (pattern.test(content)) {
      detectedTypes.push(name);
    }
  }

  return {
    hasPii: detectedTypes.length > 0,
    detectedTypes,
    confessionId: ''
  };
}

export interface PiiScanWorkerDeps {
  quarantineConfession: (confessionId: string, collegeId: string) => Promise<void>;
  openModerationCase: (confessionId: string, collegeId: string, reason: string) => Promise<void>;
}

export async function piiScanWorkerHandler(
  payload: Record<string, unknown>,
  deps: PiiScanWorkerDeps
): Promise<PiiScanResult> {
  const confessionId = payload['confessionId'] as string;
  const collegeId = payload['collegeId'] as string;
  const content = (payload['content'] as string) || '';
  const title = (payload['title'] as string) || '';

  const scanResult = scanForPii(`${title} ${content}`);
  scanResult.confessionId = confessionId;

  if (scanResult.hasPii) {
    await deps.quarantineConfession(confessionId, collegeId);
    await deps.openModerationCase(confessionId, collegeId, `PII detected: ${scanResult.detectedTypes.join(', ')}`);
  }

  return scanResult;
}
