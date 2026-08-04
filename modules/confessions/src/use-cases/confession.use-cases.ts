import {
  ConfessionRepository,
  CommentRepository,
  VoteRepository,
  BookmarkRepository,
  ModerationRepository,
  AnonymousIdentityRepository,
  NotificationRepository,
  ConfessionEntity,
  CommentEntity
} from '../domain/repository.interface.js';
import {
  assertSameCollege,
  assertNoSelfVote,
  assertCommentDepth,
  assertValidStateTransition,
  assertSingleVote,
  assertSingleBookmark
} from '../domain/invariants.js';
import { ConfessionNotFoundError, DomainError } from '../errors/domain-errors.js';

export interface EventPublisher {
  publish(eventType: string, payload: any): Promise<void>;
}

/**
 * Anonymous Identity Service - Strict Security Boundary Encapsulation
 */
export class AnonymousIdentityService {
  constructor(private identityRepo: AnonymousIdentityRepository) {}

  async getThreadPseudonym(confessionId: string, userId: string, collegeId: string): Promise<string> {
    const userIdHash = `hash-${userId}`;
    return this.identityRepo.findOrCreatePseudonym(confessionId, userIdHash, collegeId);
  }
}

export class ConfessionUseCases {
  private identityService: AnonymousIdentityService;

  constructor(
    private confessionRepo: ConfessionRepository,
    private commentRepo: CommentRepository,
    private voteRepo: VoteRepository,
    private bookmarkRepo: BookmarkRepository,
    private modRepo: ModerationRepository,
    identityRepo: AnonymousIdentityRepository,
    private notificationRepo: NotificationRepository,
    private eventPublisher: EventPublisher
  ) {
    this.identityService = new AnonymousIdentityService(identityRepo);
  }

  async createConfession(params: {
    collegeId: string;
    userId: string;
    categoryCode: string;
    title: string;
    content: string;
  }): Promise<ConfessionEntity> {
    const tempId = `draft-${Date.now()}`;
    const pseudonym = await this.identityService.getThreadPseudonym(tempId, params.userId, params.collegeId);

    const confession = await this.confessionRepo.save({
      collegeId: params.collegeId,
      categoryCode: params.categoryCode,
      title: params.title,
      content: params.content,
      authorThreadPseudonym: pseudonym,
      status: 'PUBLISHED'
    });

    await this.eventPublisher.publish('ConfessionPublished', {
      eventId: `evt-${Date.now()}`,
      eventType: 'ConfessionPublished',
      collegeId: params.collegeId,
      confessionId: confession.id,
      categoryCode: confession.categoryCode,
      title: confession.title,
      authorThreadPseudonym: pseudonym,
      occurredAt: new Date().toISOString()
    });

    return confession;
  }

  async addComment(params: {
    collegeId: string;
    confessionId: string;
    userId: string;
    content: string;
    parentCommentId?: string;
  }): Promise<CommentEntity> {
    const confession = await this.confessionRepo.findById(params.confessionId, params.collegeId);
    if (!confession) throw new ConfessionNotFoundError(params.confessionId);

    assertSameCollege(confession.collegeId, params.collegeId);

    let depth = 1;
    let rootCommentId: string | null = null;

    if (params.parentCommentId) {
      const parent = await this.commentRepo.findById(params.parentCommentId, params.collegeId);
      if (parent) {
        depth = parent.depth + 1;
        assertCommentDepth(depth, 8);
        rootCommentId = parent.rootCommentId || parent.id;
      }
    }

    const pseudonym = await this.identityService.getThreadPseudonym(
      params.confessionId,
      params.userId,
      params.collegeId
    );

    const comment = await this.commentRepo.save({
      collegeId: params.collegeId,
      confessionId: params.confessionId,
      rootCommentId,
      parentCommentId: params.parentCommentId || null,
      depth,
      authorThreadPseudonym: pseudonym,
      content: params.content,
      status: 'ACTIVE'
    });

    await this.eventPublisher.publish('CommentAdded', {
      eventId: `evt-${Date.now()}`,
      eventType: 'CommentAdded',
      collegeId: params.collegeId,
      confessionId: params.confessionId,
      commentId: comment.id,
      parentCommentId: params.parentCommentId,
      depth,
      authorThreadPseudonym: pseudonym,
      occurredAt: new Date().toISOString()
    });

    return comment;
  }

  async voteConfession(params: {
    collegeId: string;
    confessionId: string;
    voterUserId: string;
    authorUserId: string;
    voteType: 'UPVOTE' | 'DOWNVOTE' | 'REMOVE';
  }): Promise<void> {
    assertNoSelfVote(params.authorUserId, params.voterUserId);

    const existingVote = await this.voteRepo.getUserConfessionVote(
      params.confessionId,
      params.voterUserId,
      params.collegeId
    );

    if (params.voteType === 'REMOVE') {
      await this.voteRepo.removeConfessionVote(params.confessionId, params.voterUserId, params.collegeId);
      await this.eventPublisher.publish('VoteRemoved', {
        eventId: `evt-${Date.now()}`,
        eventType: 'VoteRemoved',
        targetType: 'CONFESSION',
        targetId: params.confessionId,
        voterUserId: params.voterUserId,
        collegeId: params.collegeId,
        occurredAt: new Date().toISOString()
      });
      return;
    }

    assertSingleVote(existingVote, params.confessionId);
    await this.voteRepo.addConfessionVote(params.confessionId, params.voterUserId, params.voteType, params.collegeId);

    await this.eventPublisher.publish('VoteAdded', {
      eventId: `evt-${Date.now()}`,
      eventType: 'VoteAdded',
      targetType: 'CONFESSION',
      targetId: params.confessionId,
      voterUserId: params.voterUserId,
      voteType: params.voteType,
      collegeId: params.collegeId,
      occurredAt: new Date().toISOString()
    });
  }

  async bookmarkConfession(params: { collegeId: string; confessionId: string; userId: string }): Promise<void> {
    const isBookmarked = await this.bookmarkRepo.isBookmarked(params.confessionId, params.userId, params.collegeId);
    assertSingleBookmark(isBookmarked ? {} : null, params.confessionId);

    await this.bookmarkRepo.addBookmark(params.confessionId, params.userId, params.collegeId);
    await this.eventPublisher.publish('BookmarkAdded', {
      eventId: `evt-${Date.now()}`,
      eventType: 'BookmarkAdded',
      confessionId: params.confessionId,
      userId: params.userId,
      collegeId: params.collegeId,
      occurredAt: new Date().toISOString()
    });
  }

  async reportConfession(params: {
    collegeId: string;
    confessionId: string;
    reporterUserId: string;
    reasonCode: string;
    details?: string;
  }): Promise<void> {
    const confession = await this.confessionRepo.findById(params.confessionId, params.collegeId);
    if (!confession) throw new ConfessionNotFoundError(params.confessionId);

    confession.reportsCount += 1;
    if (confession.reportsCount >= 3) {
      assertValidStateTransition(confession.status, 'QUARANTINED');
      await this.confessionRepo.updateStatus(params.confessionId, params.collegeId, 'QUARANTINED');

      await this.modRepo.saveCase({
        collegeId: params.collegeId,
        confessionId: params.confessionId,
        severityLevel: 2,
        status: 'QUARANTINED',
        totalReports: confession.reportsCount
      });
    }

    await this.eventPublisher.publish('ReportSubmitted', {
      eventId: `evt-${Date.now()}`,
      eventType: 'ReportSubmitted',
      confessionId: params.confessionId,
      reporterUserId: params.reporterUserId,
      reasonCode: params.reasonCode,
      severityLevel: 2,
      collegeId: params.collegeId,
      occurredAt: new Date().toISOString()
    });
  }

  async recordModerationDecision(params: {
    collegeId: string;
    caseId: string;
    moderatorUserId: string;
    action: 'RESTORE' | 'HIDE' | 'DELETE' | 'ESCALATE';
    reasonNote?: string;
  }): Promise<void> {
    const modCase = await this.modRepo.findCaseById(params.caseId, params.collegeId);
    if (!modCase) throw new DomainError('Moderation case not found', 'CASE_NOT_FOUND');

    await this.modRepo.recordAction({
      collegeId: params.collegeId,
      caseId: params.caseId,
      moderatorUserId: params.moderatorUserId,
      action: params.action,
      ...(params.reasonNote ? { reasonNote: params.reasonNote } : {})
    });

    if (params.action === 'RESTORE') {
      await this.confessionRepo.updateStatus(modCase.confessionId, params.collegeId, 'PUBLISHED');
    } else if (params.action === 'DELETE') {
      await this.confessionRepo.updateStatus(modCase.confessionId, params.collegeId, 'DELETED');
    }

    await this.eventPublisher.publish('ModerationDecisionRecorded', {
      eventId: `evt-${Date.now()}`,
      eventType: 'ModerationDecisionRecorded',
      caseId: params.caseId,
      confessionId: modCase.confessionId,
      action: params.action,
      moderatorUserId: params.moderatorUserId,
      collegeId: params.collegeId,
      occurredAt: new Date().toISOString()
    });
  }
}
