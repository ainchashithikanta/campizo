import { eq, and, desc, sql } from 'drizzle-orm';
import {
  confessions,
  confessionComments,
  moderationCases,
  moderationActions,
  confessionStatistics,
  confessionNotifications,
  anonymousThreadIdentities,
  rankingSnapshots,
  confessionBookmarks,
  confessionVotes,
  confessionMedia
} from '../schema/confessions.schema.js';
import {
  ConfessionEntity,
  CommentEntity,
  ModerationCaseEntity,
  ConfessionRepository,
  CommentRepository,
  ModerationRepository,
  StatisticsRepository,
  NotificationRepository,
  AnonymousIdentityRepository,
  RankingRepository,
  BookmarkRepository,
  VoteRepository,
  MediaRepository
} from '../domain/repository.interface.js';

export class DrizzleConfessionRepository implements ConfessionRepository {
  constructor(private db: any) {}

  async findById(id: string, collegeId: string): Promise<ConfessionEntity | null> {
    const rows = await this.db
      .select()
      .from(confessions)
      .where(and(eq(confessions.id, id), eq(confessions.collegeId, collegeId)))
      .limit(1);

    const row = rows[0];
    if (!row || row.status === 'DELETED') return null;
    return row as ConfessionEntity;
  }

  async findBySlug(slug: string, collegeId: string): Promise<ConfessionEntity | null> {
    const rows = await this.db
      .select()
      .from(confessions)
      .where(and(eq(confessions.slug, slug), eq(confessions.collegeId, collegeId)))
      .limit(1);

    const row = rows[0];
    if (!row || row.status === 'DELETED') return null;
    return row as ConfessionEntity;
  }

  async save(
    data: Partial<ConfessionEntity> & { collegeId: string; title: string; content: string }
  ): Promise<ConfessionEntity> {
    const slug =
      data.slug ||
      data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    const [inserted] = await this.db
      .insert(confessions)
      .values({
        collegeId: data.collegeId,
        categoryCode: data.categoryCode || 'confession',
        title: data.title,
        slug,
        content: data.content,
        authorThreadPseudonym: data.authorThreadPseudonym || 'Curious Panda #402',
        isAnonymous: data.isAnonymous !== false,
        status: data.status || 'PENDING_APPROVAL'
      })
      .returning();

    return inserted as ConfessionEntity;
  }

  async updateStatus(id: string, collegeId: string, status: ConfessionEntity['status']): Promise<void> {
    await this.db
      .update(confessions)
      .set({
        status,
        updatedAt: new Date(),
        ...(status === 'DELETED' ? { deletedAt: new Date() } : {})
      })
      .where(and(eq(confessions.id, id), eq(confessions.collegeId, collegeId)));
  }

  async listFeed(
    collegeId: string,
    options: { categoryCode?: string; tab?: 'trending' | 'latest'; cursor?: string; limit?: number }
  ): Promise<ConfessionEntity[]> {
    const limit = options.limit || 20;
    const conditions = [eq(confessions.collegeId, collegeId), eq(confessions.status, 'PUBLISHED')];

    if (options.categoryCode) {
      conditions.push(eq(confessions.categoryCode, options.categoryCode));
    }

    const order = options.tab === 'trending' ? desc(confessions.rankScore) : desc(confessions.createdAt);

    const rows = await this.db
      .select()
      .from(confessions)
      .where(and(...conditions))
      .orderBy(order)
      .limit(limit);

    return rows as ConfessionEntity[];
  }
}

export class DrizzleCommentRepository implements CommentRepository {
  constructor(private db: any) {}

  async findById(id: string, collegeId: string): Promise<CommentEntity | null> {
    const rows = await this.db
      .select()
      .from(confessionComments)
      .where(and(eq(confessionComments.id, id), eq(confessionComments.collegeId, collegeId)))
      .limit(1);

    return (rows[0] as CommentEntity) || null;
  }

  async save(
    data: Partial<CommentEntity> & { collegeId: string; confessionId: string; content: string }
  ): Promise<CommentEntity> {
    const [inserted] = await this.db
      .insert(confessionComments)
      .values({
        collegeId: data.collegeId,
        confessionId: data.confessionId,
        rootCommentId: data.rootCommentId || null,
        parentCommentId: data.parentCommentId || null,
        depth: data.depth || 1,
        authorThreadPseudonym: data.authorThreadPseudonym || 'Witty Owl #108',
        content: data.content,
        status: data.status || 'ACTIVE'
      })
      .returning();

    return inserted as CommentEntity;
  }

  async softDelete(id: string, collegeId: string): Promise<void> {
    await this.db
      .update(confessionComments)
      .set({
        status: 'SOFT_DELETED',
        content: '[Comment removed by moderation]',
        updatedAt: new Date()
      })
      .where(and(eq(confessionComments.id, id), eq(confessionComments.collegeId, collegeId)));
  }

  async listByConfession(confessionId: string, collegeId: string): Promise<CommentEntity[]> {
    const rows = await this.db
      .select()
      .from(confessionComments)
      .where(and(eq(confessionComments.confessionId, confessionId), eq(confessionComments.collegeId, collegeId)))
      .orderBy(confessionComments.createdAt);

    return rows as CommentEntity[];
  }
}

export class DrizzleModerationRepository implements ModerationRepository {
  constructor(private db: any) {}

  async findCaseById(caseId: string, collegeId: string): Promise<ModerationCaseEntity | null> {
    const rows = await this.db
      .select()
      .from(moderationCases)
      .where(and(eq(moderationCases.id, caseId), eq(moderationCases.collegeId, collegeId)))
      .limit(1);

    return (rows[0] as ModerationCaseEntity) || null;
  }

  async saveCase(
    data: Partial<ModerationCaseEntity> & { collegeId: string; confessionId: string; severityLevel: number }
  ): Promise<ModerationCaseEntity> {
    const [inserted] = await this.db
      .insert(moderationCases)
      .values({
        collegeId: data.collegeId,
        confessionId: data.confessionId,
        severityLevel: data.severityLevel,
        status: data.status || 'OPEN',
        totalReports: data.totalReports || 1
      })
      .returning();

    return inserted as ModerationCaseEntity;
  }

  async recordAction(action: {
    collegeId: string;
    caseId: string;
    moderatorUserId: string;
    action: string;
    reasonNote?: string;
  }): Promise<void> {
    await this.db.insert(moderationActions).values({
      collegeId: action.collegeId,
      caseId: action.caseId,
      moderatorUserId: action.moderatorUserId,
      action: action.action,
      reasonNote: action.reasonNote
    });
  }

  async listQueue(collegeId: string): Promise<ModerationCaseEntity[]> {
    const rows = await this.db
      .select()
      .from(moderationCases)
      .where(
        and(
          eq(moderationCases.collegeId, collegeId),
          sql`${moderationCases.status} IN ('OPEN', 'UNDER_REVIEW', 'QUARANTINED')`
        )
      )
      .orderBy(moderationCases.severityLevel);

    return rows as ModerationCaseEntity[];
  }
}

export class DrizzleStatisticsRepository implements StatisticsRepository {
  constructor(private db: any) {}

  async incrementViews(confessionId: string, collegeId: string): Promise<void> {
    await this.db
      .insert(confessionStatistics)
      .values({ confessionId, collegeId, totalViews: 1 })
      .onConflictDoUpdate({
        target: confessionStatistics.confessionId,
        set: { totalViews: sql`${confessionStatistics.totalViews} + 1` }
      });
  }

  async recalculateScores(
    confessionId: string,
    collegeId: string,
    metrics: { trendingScore: string; hotScore: string }
  ): Promise<void> {
    await this.db
      .insert(confessionStatistics)
      .values({ confessionId, collegeId, trendingScore: metrics.trendingScore, hotScore: metrics.hotScore })
      .onConflictDoUpdate({
        target: confessionStatistics.confessionId,
        set: { trendingScore: metrics.trendingScore, hotScore: metrics.hotScore, lastCalculatedAt: new Date() }
      });
  }
}

export class DrizzleNotificationRepository implements NotificationRepository {
  constructor(private db: any) {}

  async queueNotification(notification: {
    collegeId: string;
    recipientUserId: string;
    notificationType: string;
    payloadJson: string;
  }): Promise<void> {
    await this.db.insert(confessionNotifications).values({
      collegeId: notification.collegeId,
      recipientUserId: notification.recipientUserId,
      notificationType: notification.notificationType,
      payloadJson: notification.payloadJson
    });
  }
}

export class DrizzleAnonymousIdentityRepository implements AnonymousIdentityRepository {
  constructor(private db: any) {}

  async findOrCreatePseudonym(confessionId: string, userIdHash: string, collegeId: string): Promise<string> {
    const existing = await this.db
      .select()
      .from(anonymousThreadIdentities)
      .where(
        and(
          eq(anonymousThreadIdentities.confessionId, confessionId),
          eq(anonymousThreadIdentities.userIdHash, userIdHash)
        )
      )
      .limit(1);

    if (existing[0]) return existing[0].assignedPseudonym;

    const ANIMALS = ['Panda', 'Owl', 'Falcon', 'Fox', 'Otter', 'Tiger'];
    const ADJECTIVES = ['Curious', 'Witty', 'Silent', 'Brave', 'Clever', 'Swift'];
    const pseudonym = `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]} ${ANIMALS[Math.floor(Math.random() * ANIMALS.length)]} #${Math.floor(100 + Math.random() * 900)}`;

    const [inserted] = await this.db
      .insert(anonymousThreadIdentities)
      .values({ collegeId, confessionId, userIdHash, assignedPseudonym: pseudonym })
      .returning();

    return inserted.assignedPseudonym;
  }
}

export class DrizzleRankingRepository implements RankingRepository {
  constructor(private db: any) {}

  async saveSnapshot(snapshot: {
    collegeId: string;
    snapshotType: string;
    topConfessionIdsJson: string;
  }): Promise<void> {
    await this.db.insert(rankingSnapshots).values(snapshot);
  }
}

export class DrizzleBookmarkRepository implements BookmarkRepository {
  constructor(private db: any) {}

  async addBookmark(confessionId: string, userId: string, collegeId: string): Promise<void> {
    await this.db.insert(confessionBookmarks).values({ confessionId, userId, collegeId });
  }

  async removeBookmark(confessionId: string, userId: string, collegeId: string): Promise<void> {
    await this.db
      .delete(confessionBookmarks)
      .where(
        and(
          eq(confessionBookmarks.confessionId, confessionId),
          eq(confessionBookmarks.userId, userId),
          eq(confessionBookmarks.collegeId, collegeId)
        )
      );
  }

  async isBookmarked(confessionId: string, userId: string, collegeId: string): Promise<boolean> {
    const rows = await this.db
      .select()
      .from(confessionBookmarks)
      .where(
        and(
          eq(confessionBookmarks.confessionId, confessionId),
          eq(confessionBookmarks.userId, userId),
          eq(confessionBookmarks.collegeId, collegeId)
        )
      )
      .limit(1);

    return !!rows[0];
  }
}

export class DrizzleVoteRepository implements VoteRepository {
  constructor(private db: any) {}

  async addConfessionVote(
    confessionId: string,
    voterUserId: string,
    voteType: 'UPVOTE' | 'DOWNVOTE',
    collegeId: string
  ): Promise<void> {
    await this.db.insert(confessionVotes).values({ confessionId, voterUserId, voteType, collegeId });
  }

  async removeConfessionVote(confessionId: string, voterUserId: string, collegeId: string): Promise<void> {
    await this.db
      .delete(confessionVotes)
      .where(
        and(
          eq(confessionVotes.confessionId, confessionId),
          eq(confessionVotes.voterUserId, voterUserId),
          eq(confessionVotes.collegeId, collegeId)
        )
      );
  }

  async getUserConfessionVote(
    confessionId: string,
    voterUserId: string,
    collegeId: string
  ): Promise<'UPVOTE' | 'DOWNVOTE' | null> {
    const rows = await this.db
      .select()
      .from(confessionVotes)
      .where(
        and(
          eq(confessionVotes.confessionId, confessionId),
          eq(confessionVotes.voterUserId, voterUserId),
          eq(confessionVotes.collegeId, collegeId)
        )
      )
      .limit(1);

    return rows[0] ? (rows[0].voteType as 'UPVOTE' | 'DOWNVOTE') : null;
  }
}

export class DrizzleMediaRepository implements MediaRepository {
  constructor(private db: any) {}

  async attachMedia(
    confessionId: string,
    mediaUrl: string,
    mediaType: string,
    mimeType: string,
    collegeId: string
  ): Promise<void> {
    await this.db.insert(confessionMedia).values({ confessionId, mediaUrl, mediaType, mimeType, collegeId });
  }
}
