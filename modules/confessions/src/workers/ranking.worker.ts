/**
 * Ranking Worker
 *
 * Trigger: VoteAdded, VoteRemoved, CommentAdded, ReportSubmitted
 *
 * Incrementally updates ranking scores for the AFFECTED confession only.
 * No full recomputation. Periodic full recalc is a separate maintenance task.
 *
 * Scores:
 *   - Trending: time-weighted upvote velocity
 *   - Hot: (upvotes - reports) / age^1.5
 *   - Recent: pure timestamp order (no computation needed)
 *   - Controversial: high engagement + high report ratio
 *
 * Generates immutable ranking snapshots. Workers atomically switch the active one.
 */

export interface RankingScores {
  trendingScore: string;
  hotScore: string;
  controversialScore: string;
}

export interface RankingWorkerDeps {
  recalculateScores: (
    confessionId: string,
    collegeId: string,
    scores: { trendingScore: string; hotScore: string }
  ) => Promise<void>;
  saveSnapshot: (snapshot: { collegeId: string; snapshotType: string; topConfessionIdsJson: string }) => Promise<void>;
}

/**
 * Calculate ranking scores from engagement metrics.
 * Pure function — no side effects, fully testable.
 */
export function calculateRankingScores(metrics: {
  upvotes: number;
  comments: number;
  reports: number;
  ageHours: number;
}): RankingScores {
  const { upvotes, comments, reports, ageHours } = metrics;
  const age = Math.max(ageHours, 1);

  // Trending: upvote + comment velocity over time
  const trendingScore = ((upvotes * 2 + comments) / Math.pow(age, 1.2)).toFixed(4);

  // Hot: net positive engagement dampened by age
  const hotScore = (Math.max(upvotes - reports, 0) / Math.pow(age, 1.5)).toFixed(4);

  // Controversial: high engagement with high report ratio
  const totalEngagement = upvotes + comments;
  const controversialScore =
    totalEngagement > 0 ? ((reports / totalEngagement) * Math.log2(totalEngagement + 1)).toFixed(4) : '0.0000';

  return { trendingScore, hotScore, controversialScore };
}

export async function rankingWorkerHandler(
  payload: Record<string, unknown>,
  deps: RankingWorkerDeps
): Promise<RankingScores> {
  const confessionId = (payload['confessionId'] as string) || (payload['targetId'] as string);
  const collegeId = payload['collegeId'] as string;

  // In production these come from confession_statistics
  // Here we use event payload for incremental update
  const upvotes = (payload['upvotes'] as number) || 1;
  const comments = (payload['comments'] as number) || 0;
  const reports = (payload['reports'] as number) || 0;
  const ageHours = (payload['ageHours'] as number) || 1;

  const scores = calculateRankingScores({ upvotes, comments, reports, ageHours });

  await deps.recalculateScores(confessionId, collegeId, {
    trendingScore: scores.trendingScore,
    hotScore: scores.hotScore
  });

  // Generate immutable snapshot
  await deps.saveSnapshot({
    collegeId,
    snapshotType: 'INCREMENTAL',
    topConfessionIdsJson: JSON.stringify([confessionId])
  });

  return scores;
}
