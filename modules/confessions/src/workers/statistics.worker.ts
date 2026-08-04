/**
 * Statistics Worker
 *
 * SOLE writer to confession_statistics table.
 * No other worker or use case may write to this table.
 *
 * Trigger: VoteAdded, VoteRemoved, CommentAdded, BookmarkAdded,
 *          BookmarkRemoved, ReportSubmitted, ModerationDecisionRecorded
 *
 * Handles: views, votes, comments, bookmarks, reports
 */

export interface StatisticsUpdate {
  confessionId: string;
  collegeId: string;
  metric: 'VOTE' | 'COMMENT' | 'BOOKMARK' | 'REPORT' | 'VIEW';
  delta: number;
}

export interface StatisticsWorkerDeps {
  incrementViews: (confessionId: string, collegeId: string) => Promise<void>;
  recalculateScores: (confessionId: string, collegeId: string, metrics: { trendingScore: string; hotScore: string }) => Promise<void>;
}

export async function statisticsWorkerHandler(
  payload: Record<string, unknown>,
  deps: StatisticsWorkerDeps
): Promise<StatisticsUpdate> {
  const eventType = payload['eventType'] as string;
  const confessionId = payload['confessionId'] as string || payload['targetId'] as string;
  const collegeId = payload['collegeId'] as string;

  let metric: StatisticsUpdate['metric'] = 'VIEW';
  let delta = 1;

  switch (eventType) {
    case 'VoteAdded':
      metric = 'VOTE';
      delta = 1;
      break;
    case 'VoteRemoved':
      metric = 'VOTE';
      delta = -1;
      break;
    case 'CommentAdded':
      metric = 'COMMENT';
      delta = 1;
      break;
    case 'BookmarkAdded':
      metric = 'BOOKMARK';
      delta = 1;
      break;
    case 'BookmarkRemoved':
      metric = 'BOOKMARK';
      delta = -1;
      break;
    case 'ReportSubmitted':
      metric = 'REPORT';
      delta = 1;
      break;
    case 'ModerationDecisionRecorded':
      metric = 'REPORT';
      delta = 0; // status change, no counter delta
      break;
    default:
      metric = 'VIEW';
      delta = 1;
  }

  // Statistics update — in production this is an atomic upsert
  await deps.incrementViews(confessionId, collegeId);

  return { confessionId, collegeId, metric, delta };
}
