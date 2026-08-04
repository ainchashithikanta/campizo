/**
 * Cleanup Worker
 *
 * Periodic cleanup:
 *   - Expired notifications (> 30 days)
 *   - Old ranking snapshots (keep last N per college)
 *   - Temporary files
 *   - Obsolete caches
 *
 * Trigger: ConfessionArchived, ConfessionDeleted, or periodic schedule
 */

export interface CleanupResult {
  expiredNotifications: number;
  oldSnapshots: number;
  temporaryFiles: number;
}

export interface CleanupWorkerDeps {
  deleteExpiredNotifications: (collegeId: string, olderThanDays: number) => Promise<number>;
  pruneOldSnapshots: (collegeId: string, keepCount: number) => Promise<number>;
  cleanTemporaryFiles: (collegeId: string) => Promise<number>;
}

export async function cleanupWorkerHandler(
  payload: Record<string, unknown>,
  deps: CleanupWorkerDeps
): Promise<CleanupResult> {
  const collegeId = payload['collegeId'] as string;

  const [expiredNotifications, oldSnapshots, temporaryFiles] = await Promise.all([
    deps.deleteExpiredNotifications(collegeId, 30),
    deps.pruneOldSnapshots(collegeId, 50),
    deps.cleanTemporaryFiles(collegeId)
  ]);

  return { expiredNotifications, oldSnapshots, temporaryFiles };
}
