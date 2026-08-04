/**
 * Moderation Worker
 *
 * Trigger: ReportSubmitted
 *
 * Automatically:
 *   - Opens a moderation case when report threshold is reached
 *   - Quarantines confession after threshold
 *   - Assigns severity level based on report count + reason codes
 *
 * Never exposes anonymous identity in any output.
 */

export interface ModerationWorkerResult {
  confessionId: string;
  collegeId: string;
  action: 'CASE_OPENED' | 'THRESHOLD_NOT_REACHED' | 'ALREADY_QUARANTINED';
  severityLevel: number;
}

export interface ModerationWorkerDeps {
  getReportCount: (confessionId: string, collegeId: string) => Promise<number>;
  quarantineConfession: (confessionId: string, collegeId: string) => Promise<void>;
  openModerationCase: (confessionId: string, collegeId: string, reason: string) => Promise<void>;
}

const QUARANTINE_THRESHOLD = 3;

const SEVERITY_MAP: Record<string, number> = {
  HARASSMENT: 1,
  HATE_SPEECH: 1,
  THREAT: 1,
  DOXXING: 1,
  SPAM: 3,
  INAPPROPRIATE: 2,
  OTHER: 3
};

export async function moderationWorkerHandler(
  payload: Record<string, unknown>,
  deps: ModerationWorkerDeps
): Promise<ModerationWorkerResult> {
  const confessionId = payload['confessionId'] as string;
  const collegeId = payload['collegeId'] as string;
  const reasonCode = (payload['reasonCode'] as string) || 'OTHER';

  const reportCount = await deps.getReportCount(confessionId, collegeId);
  const severityLevel = SEVERITY_MAP[reasonCode] ?? 3;

  if (reportCount < QUARANTINE_THRESHOLD) {
    return {
      confessionId,
      collegeId,
      action: 'THRESHOLD_NOT_REACHED',
      severityLevel
    };
  }

  await deps.quarantineConfession(confessionId, collegeId);
  await deps.openModerationCase(
    confessionId,
    collegeId,
    `Auto-quarantined after ${reportCount} reports. Latest reason: ${reasonCode}`
  );

  return {
    confessionId,
    collegeId,
    action: 'CASE_OPENED',
    severityLevel
  };
}
