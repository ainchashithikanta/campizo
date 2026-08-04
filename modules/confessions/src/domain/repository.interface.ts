export interface ConfessionEntity {
  id: string;
  collegeId: string;
  categoryCode: string;
  title: string;
  slug: string;
  content: string;
  authorThreadPseudonym: string;
  status: 'DRAFT' | 'PUBLISHED' | 'QUARANTINED' | 'ARCHIVED' | 'DELETED';
  upvotesCount: number;
  commentsCount: number;
  reportsCount: number;
  rankScore: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CommentEntity {
  id: string;
  collegeId: string;
  confessionId: string;
  rootCommentId?: string | null;
  parentCommentId?: string | null;
  depth: number;
  authorThreadPseudonym: string;
  content: string;
  status: 'ACTIVE' | 'SOFT_DELETED' | 'QUARANTINED';
  upvotesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModerationCaseEntity {
  id: string;
  collegeId: string;
  confessionId: string;
  severityLevel: number;
  status: 'OPEN' | 'UNDER_REVIEW' | 'QUARANTINED' | 'CLOSED';
  totalReports: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConfessionRepository {
  findById(id: string, collegeId: string): Promise<ConfessionEntity | null>;
  findBySlug(slug: string, collegeId: string): Promise<ConfessionEntity | null>;
  save(
    confession: Partial<ConfessionEntity> & { collegeId: string; title: string; content: string }
  ): Promise<ConfessionEntity>;
  updateStatus(id: string, collegeId: string, status: ConfessionEntity['status']): Promise<void>;
  listFeed(
    collegeId: string,
    options: { categoryCode?: string; tab?: 'trending' | 'latest'; cursor?: string; limit?: number }
  ): Promise<ConfessionEntity[]>;
}

export interface CommentRepository {
  findById(id: string, collegeId: string): Promise<CommentEntity | null>;
  save(
    comment: Partial<CommentEntity> & { collegeId: string; confessionId: string; content: string }
  ): Promise<CommentEntity>;
  softDelete(id: string, collegeId: string): Promise<void>;
  listByConfession(confessionId: string, collegeId: string): Promise<CommentEntity[]>;
}

export interface ModerationRepository {
  findCaseById(caseId: string, collegeId: string): Promise<ModerationCaseEntity | null>;
  saveCase(
    modCase: Partial<ModerationCaseEntity> & { collegeId: string; confessionId: string; severityLevel: number }
  ): Promise<ModerationCaseEntity>;
  recordAction(action: {
    collegeId: string;
    caseId: string;
    moderatorUserId: string;
    action: string;
    reasonNote?: string;
  }): Promise<void>;
  listQueue(collegeId: string): Promise<ModerationCaseEntity[]>;
}

export interface StatisticsRepository {
  incrementViews(confessionId: string, collegeId: string): Promise<void>;
  recalculateScores(
    confessionId: string,
    collegeId: string,
    metrics: { trendingScore: string; hotScore: string }
  ): Promise<void>;
}

export interface NotificationRepository {
  queueNotification(notification: {
    collegeId: string;
    recipientUserId: string;
    notificationType: string;
    payloadJson: string;
  }): Promise<void>;
}

export interface AnonymousIdentityRepository {
  findOrCreatePseudonym(confessionId: string, userIdHash: string, collegeId: string): Promise<string>;
}

export interface RankingRepository {
  saveSnapshot(snapshot: { collegeId: string; snapshotType: string; topConfessionIdsJson: string }): Promise<void>;
}

export interface BookmarkRepository {
  addBookmark(confessionId: string, userId: string, collegeId: string): Promise<void>;
  removeBookmark(confessionId: string, userId: string, collegeId: string): Promise<void>;
  isBookmarked(confessionId: string, userId: string, collegeId: string): Promise<boolean>;
}

export interface VoteRepository {
  addConfessionVote(
    confessionId: string,
    voterUserId: string,
    voteType: 'UPVOTE' | 'DOWNVOTE',
    collegeId: string
  ): Promise<void>;
  removeConfessionVote(confessionId: string, voterUserId: string, collegeId: string): Promise<void>;
  getUserConfessionVote(
    confessionId: string,
    voterUserId: string,
    collegeId: string
  ): Promise<'UPVOTE' | 'DOWNVOTE' | null>;
}

export interface MediaRepository {
  attachMedia(
    confessionId: string,
    mediaUrl: string,
    mediaType: string,
    mimeType: string,
    collegeId: string
  ): Promise<void>;
}
