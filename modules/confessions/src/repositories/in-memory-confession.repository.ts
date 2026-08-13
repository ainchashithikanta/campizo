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

export class InMemoryConfessionRepository implements ConfessionRepository {
  public confessionsMap = new Map<string, ConfessionEntity>();

  async findById(id: string, collegeId: string): Promise<ConfessionEntity | null> {
    const item = this.confessionsMap.get(id);
    if (!item || item.collegeId !== collegeId || item.status === 'DELETED') return null;
    return item;
  }

  async findBySlug(slug: string, collegeId: string): Promise<ConfessionEntity | null> {
    for (const item of this.confessionsMap.values()) {
      if (item.slug === slug && item.collegeId === collegeId && item.status !== 'DELETED') {
        return item;
      }
    }
    return null;
  }

  async save(
    data: Partial<ConfessionEntity> & { collegeId: string; title: string; content: string }
  ): Promise<ConfessionEntity> {
    const id = data.id || `conf-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const now = new Date();
    const entity: ConfessionEntity = {
      id,
      collegeId: data.collegeId,
      categoryCode: data.categoryCode || 'confession',
      title: data.title,
      slug:
        data.slug ||
        data.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, ''),
      content: data.content,
      authorThreadPseudonym: data.authorThreadPseudonym || 'Curious Panda #402',
      isAnonymous: data.isAnonymous !== false,
      status: data.status || 'PUBLISHED',
      upvotesCount: data.upvotesCount || 0,
      commentsCount: data.commentsCount || 0,
      reportsCount: data.reportsCount || 0,
      rankScore: data.rankScore || '0.0000',
      createdAt: data.createdAt || now,
      updatedAt: now,
      deletedAt: data.deletedAt || null
    };

    this.confessionsMap.set(id, entity);
    return entity;
  }

  async updateStatus(id: string, collegeId: string, status: ConfessionEntity['status']): Promise<void> {
    const item = await this.findById(id, collegeId);
    if (item) {
      item.status = status;
      item.updatedAt = new Date();
      if (status === 'DELETED') item.deletedAt = new Date();
    }
  }

  async listFeed(
    collegeId: string,
    options: { categoryCode?: string; tab?: 'trending' | 'latest'; cursor?: string; limit?: number }
  ): Promise<ConfessionEntity[]> {
    let items = Array.from(this.confessionsMap.values()).filter(
      (i) => i.collegeId === collegeId && i.status === 'PUBLISHED'
    );

    if (options.categoryCode) {
      items = items.filter((i) => i.categoryCode === options.categoryCode);
    }

    if (options.tab === 'trending') {
      items.sort((a, b) => parseFloat(b.rankScore) - parseFloat(a.rankScore));
    } else {
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    const limit = options.limit || 20;
    return items.slice(0, limit);
  }
}

export class InMemoryCommentRepository implements CommentRepository {
  public commentsMap = new Map<string, CommentEntity>();

  async findById(id: string, collegeId: string): Promise<CommentEntity | null> {
    const item = this.commentsMap.get(id);
    if (!item || item.collegeId !== collegeId) return null;
    return item;
  }

  async save(
    data: Partial<CommentEntity> & { collegeId: string; confessionId: string; content: string }
  ): Promise<CommentEntity> {
    const id = data.id || `comm-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const now = new Date();
    const entity: CommentEntity = {
      id,
      collegeId: data.collegeId,
      confessionId: data.confessionId,
      rootCommentId: data.rootCommentId || null,
      parentCommentId: data.parentCommentId || null,
      depth: data.depth || 1,
      authorThreadPseudonym: data.authorThreadPseudonym || 'Witty Owl #108',
      content: data.content,
      status: data.status || 'ACTIVE',
      upvotesCount: data.upvotesCount || 0,
      createdAt: data.createdAt || now,
      updatedAt: now
    };

    this.commentsMap.set(id, entity);
    return entity;
  }

  async softDelete(id: string, collegeId: string): Promise<void> {
    const item = await this.findById(id, collegeId);
    if (item) {
      item.status = 'SOFT_DELETED';
      item.content = '[Comment removed by moderation]';
      item.updatedAt = new Date();
    }
  }

  async listByConfession(confessionId: string, collegeId: string): Promise<CommentEntity[]> {
    return Array.from(this.commentsMap.values())
      .filter((c) => c.confessionId === confessionId && c.collegeId === collegeId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}

export class InMemoryModerationRepository implements ModerationRepository {
  public casesMap = new Map<string, ModerationCaseEntity>();

  async findCaseById(caseId: string, collegeId: string): Promise<ModerationCaseEntity | null> {
    const item = this.casesMap.get(caseId);
    if (!item || item.collegeId !== collegeId) return null;
    return item;
  }

  async saveCase(
    data: Partial<ModerationCaseEntity> & { collegeId: string; confessionId: string; severityLevel: number }
  ): Promise<ModerationCaseEntity> {
    const id = data.id || `mod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const now = new Date();
    const entity: ModerationCaseEntity = {
      id,
      collegeId: data.collegeId,
      confessionId: data.confessionId,
      severityLevel: data.severityLevel,
      status: data.status || 'OPEN',
      totalReports: data.totalReports || 1,
      createdAt: data.createdAt || now,
      updatedAt: now
    };

    this.casesMap.set(id, entity);
    return entity;
  }

  async recordAction(_action: {
    collegeId: string;
    caseId: string;
    moderatorUserId: string;
    action: string;
    reasonNote?: string;
  }): Promise<void> {}

  async listQueue(collegeId: string): Promise<ModerationCaseEntity[]> {
    return Array.from(this.casesMap.values())
      .filter(
        (c) =>
          c.collegeId === collegeId &&
          (c.status === 'OPEN' || c.status === 'UNDER_REVIEW' || c.status === 'QUARANTINED')
      )
      .sort((a, b) => a.severityLevel - b.severityLevel);
  }
}

export class InMemoryStatisticsRepository implements StatisticsRepository {
  public statsMap = new Map<
    string,
    { views: number; upvotes: number; comments: number; reports: number; trendingScore: string }
  >();

  async incrementViews(confessionId: string, _collegeId: string): Promise<void> {
    const stat = this.statsMap.get(confessionId) || {
      views: 0,
      upvotes: 0,
      comments: 0,
      reports: 0,
      trendingScore: '0.0000'
    };
    stat.views += 1;
    this.statsMap.set(confessionId, stat);
  }

  async recalculateScores(
    confessionId: string,
    _collegeId: string,
    metrics: { trendingScore: string; hotScore: string }
  ): Promise<void> {
    const stat = this.statsMap.get(confessionId) || {
      views: 0,
      upvotes: 0,
      comments: 0,
      reports: 0,
      trendingScore: '0.0000'
    };
    stat.trendingScore = metrics.trendingScore;
    this.statsMap.set(confessionId, stat);
  }
}

export class InMemoryNotificationRepository implements NotificationRepository {
  public notifications: Array<{
    collegeId: string;
    recipientUserId: string;
    notificationType: string;
    payloadJson: string;
  }> = [];

  async queueNotification(notification: {
    collegeId: string;
    recipientUserId: string;
    notificationType: string;
    payloadJson: string;
  }): Promise<void> {
    this.notifications.push(notification);
  }
}

export class InMemoryAnonymousIdentityRepository implements AnonymousIdentityRepository {
  public identities = new Map<string, string>(); // `confessionId:userIdHash` -> Pseudonym

  async findOrCreatePseudonym(confessionId: string, userIdHash: string, _collegeId: string): Promise<string> {
    const key = `${confessionId}:${userIdHash}`;
    if (this.identities.has(key)) {
      return this.identities.get(key)!;
    }

    const ANIMALS = ['Panda', 'Owl', 'Falcon', 'Fox', 'Otter', 'Tiger'];
    const ADJECTIVES = ['Curious', 'Witty', 'Silent', 'Brave', 'Clever', 'Swift'];
    const randomAdj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const randomAnimal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const randomHash = Math.floor(100 + Math.random() * 900);
    const pseudonym = `${randomAdj} ${randomAnimal} #${randomHash}`;

    this.identities.set(key, pseudonym);
    return pseudonym;
  }
}

export class InMemoryRankingRepository implements RankingRepository {
  public snapshots: Array<{ collegeId: string; snapshotType: string; topConfessionIdsJson: string }> = [];

  async saveSnapshot(snapshot: {
    collegeId: string;
    snapshotType: string;
    topConfessionIdsJson: string;
  }): Promise<void> {
    this.snapshots.push(snapshot);
  }
}

export class InMemoryBookmarkRepository implements BookmarkRepository {
  public bookmarks = new Set<string>(); // `${userId}:${confessionId}`

  async addBookmark(confessionId: string, userId: string, _collegeId: string): Promise<void> {
    this.bookmarks.add(`${userId}:${confessionId}`);
  }

  async removeBookmark(confessionId: string, userId: string, _collegeId: string): Promise<void> {
    this.bookmarks.delete(`${userId}:${confessionId}`);
  }

  async isBookmarked(confessionId: string, userId: string, _collegeId: string): Promise<boolean> {
    return this.bookmarks.has(`${userId}:${confessionId}`);
  }
}

export class InMemoryVoteRepository implements VoteRepository {
  public votes = new Map<string, 'UPVOTE' | 'DOWNVOTE'>(); // `${userId}:${confessionId}`

  async addConfessionVote(
    confessionId: string,
    voterUserId: string,
    voteType: 'UPVOTE' | 'DOWNVOTE',
    _collegeId: string
  ): Promise<void> {
    this.votes.set(`${voterUserId}:${confessionId}`, voteType);
  }

  async removeConfessionVote(confessionId: string, voterUserId: string, _collegeId: string): Promise<void> {
    this.votes.delete(`${voterUserId}:${confessionId}`);
  }

  async getUserConfessionVote(
    confessionId: string,
    voterUserId: string,
    _collegeId: string
  ): Promise<'UPVOTE' | 'DOWNVOTE' | null> {
    return this.votes.get(`${voterUserId}:${confessionId}`) || null;
  }
}

export class InMemoryMediaRepository implements MediaRepository {
  public mediaList: Array<{ confessionId: string; mediaUrl: string; mediaType: string }> = [];

  async attachMedia(
    confessionId: string,
    mediaUrl: string,
    mediaType: string,
    _mimeType: string,
    _collegeId: string
  ): Promise<void> {
    this.mediaList.push({ confessionId, mediaUrl, mediaType });
  }
}
