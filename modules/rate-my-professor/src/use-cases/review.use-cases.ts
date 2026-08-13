import { randomUUID } from 'node:crypto';
import type { EventBus } from '@college-hub/core';
import type { ReviewRepository, ProfessorRepository, ReviewEntity } from '../domain/repository.interface.js';
import {
  assertStudentEligibleToReview,
  assertReviewInEditWindow,
  assertValidRatingScore,
  BusinessInvariantError
} from '../domain/invariants.js';
import {
  EntityNotFoundError,
  DuplicateReviewError,
  EditWindowExpiredError,
  UnauthorizedReviewError
} from '../errors/application-errors.js';

export interface SubmitReviewCommand {
  collegeId: string;
  professorId: string;
  courseAssignmentId: string;
  authorUserId: string;
  authorAnonymousToken: string;
  isAnonymous?: boolean;
  gradeReceived?: string;
  reviewText: string;
  overallRating: number;
  dimensions?: Record<string, number> | null;
}

export class SubmitReviewUseCase {
  constructor(
    private readonly reviewRepo: ReviewRepository,
    private readonly professorRepo: ProfessorRepository,
    private readonly eventBus: EventBus
  ) {}

  public async execute(command: SubmitReviewCommand): Promise<ReviewEntity> {
    assertValidRatingScore(command.overallRating);

    const professor = await this.professorRepo.findById(command.professorId, command.collegeId);
    if (!professor) {
      throw new EntityNotFoundError('Professor', command.professorId);
    }

    const alreadyReviewed = await this.reviewRepo.findAlreadyReviewed(
      command.authorUserId,
      command.professorId,
      command.courseAssignmentId,
      command.collegeId
    );

    if (alreadyReviewed) {
      throw new DuplicateReviewError();
    }

    assertStudentEligibleToReview({
      authorUserId: command.authorUserId,
      hasAlreadyReviewedTerm: alreadyReviewed,
      professorStatus: professor.status
    });

    const newReview: ReviewEntity = {
      id: randomUUID(),
      collegeId: command.collegeId,
      professorId: command.professorId,
      courseAssignmentId: command.courseAssignmentId,
      authorUserId: command.authorUserId,
      authorAnonymousToken: command.authorAnonymousToken,
      isAnonymous: command.isAnonymous ?? true,
      reviewText: command.reviewText,
      overallRating: command.overallRating,
      moderationStatus: 'APPROVED',
      helpfulCount: 0,
      unhelpfulCount: 0,
      dimensions: command.dimensions ?? null,
      createdAt: new Date()
    };

    const saved = await this.reviewRepo.save(newReview);

    await this.eventBus.publish('ReviewCreated', {
      eventId: randomUUID(),
      eventName: 'ReviewCreated',
      collegeId: saved.collegeId,
      aggregateId: saved.id,
      timestamp: new Date(),
      payload: {
        reviewId: saved.id,
        professorId: saved.professorId,
        collegeId: saved.collegeId,
        authorAnonymousToken: saved.authorAnonymousToken,
        overallRating: saved.overallRating
      }
    });

    await this.eventBus.publish('ReviewPublished', {
      eventId: randomUUID(),
      eventName: 'ReviewPublished',
      collegeId: saved.collegeId,
      aggregateId: saved.id,
      timestamp: new Date(),
      payload: {
        reviewId: saved.id,
        professorId: saved.professorId,
        collegeId: saved.collegeId,
        overallRating: saved.overallRating
      }
    });

    return saved;
  }
}

export class EditReviewUseCase {
  constructor(
    private readonly reviewRepo: ReviewRepository,
    private readonly eventBus: EventBus
  ) {}

  public async execute(params: {
    reviewId: string;
    authorUserId: string;
    collegeId: string;
    newReviewText: string;
    newOverallRating: number;
  }): Promise<ReviewEntity> {
    assertValidRatingScore(params.newOverallRating);

    const existing = await this.reviewRepo.findById(params.reviewId, params.collegeId);
    if (!existing) {
      throw new EntityNotFoundError('Review', params.reviewId);
    }

    if (existing.authorUserId !== params.authorUserId) {
      throw new UnauthorizedReviewError('You are not authorized to edit this review.');
    }

    try {
      assertReviewInEditWindow(existing.createdAt, 24);
    } catch (err: any) {
      if (err instanceof BusinessInvariantError && err.errorCode === 'EDIT_WINDOW_EXPIRED') {
        throw new EditWindowExpiredError();
      }
      throw err;
    }

    existing.reviewText = params.newReviewText;
    existing.overallRating = params.newOverallRating;

    const saved = await this.reviewRepo.save(existing);

    await this.eventBus.publish('ReviewUpdated', {
      eventId: randomUUID(),
      eventName: 'ReviewUpdated',
      collegeId: saved.collegeId,
      aggregateId: saved.id,
      timestamp: new Date(),
      payload: {
        reviewId: saved.id,
        professorId: saved.professorId,
        collegeId: saved.collegeId,
        newOverallRating: saved.overallRating
      }
    });

    return saved;
  }
}

export class GetReviewsUseCase {
  constructor(private readonly reviewRepo: ReviewRepository) {}

  public async execute(params: {
    professorId: string;
    collegeId: string;
    limit?: number;
    offset?: number;
  }): Promise<ReviewEntity[]> {
    return this.reviewRepo.findByProfessorId(params.professorId, params.collegeId);
  }
}

export class DeleteReviewUseCase {
  constructor(
    private readonly reviewRepo: ReviewRepository,
    private readonly eventBus: EventBus
  ) {}

  public async execute(params: { reviewId: string; authorUserId: string; collegeId: string }): Promise<void> {
    const existing = await this.reviewRepo.findById(params.reviewId, params.collegeId);
    if (!existing) {
      throw new EntityNotFoundError('Review', params.reviewId);
    }

    if (existing.authorUserId !== params.authorUserId) {
      throw new UnauthorizedReviewError('You are not authorized to delete this review.');
    }

    try {
      assertReviewInEditWindow(existing.createdAt, 24);
    } catch (err: any) {
      if (err instanceof BusinessInvariantError && err.errorCode === 'EDIT_WINDOW_EXPIRED') {
        throw new EditWindowExpiredError();
      }
      throw err;
    }

    existing.moderationStatus = 'REJECTED';
    await this.reviewRepo.save(existing);

    await this.eventBus.publish('ReviewDeleted', {
      eventId: randomUUID(),
      eventName: 'ReviewDeleted',
      collegeId: existing.collegeId,
      aggregateId: existing.id,
      timestamp: new Date(),
      payload: {
        reviewId: existing.id,
        professorId: existing.professorId,
        collegeId: existing.collegeId
      }
    });
  }
}

export class GetReviewModerationQueueUseCase {
  constructor(private readonly reviewRepo: ReviewRepository) {}

  public async execute(params: { collegeId: string }): Promise<ReviewEntity[]> {
    return this.reviewRepo.listPendingModeration(params.collegeId);
  }
}

export type ReviewModerationAction = 'APPROVE' | 'HIDE' | 'REJECT' | 'RESTORE';

export class ModerateReviewUseCase {
  constructor(
    private readonly reviewRepo: ReviewRepository,
    private readonly eventBus: EventBus
  ) {}

  public async execute(params: {
    reviewId: string;
    collegeId: string;
    moderatorUserId: string;
    action: ReviewModerationAction;
    reasonNote?: string;
  }): Promise<ReviewEntity> {
    const existing = await this.reviewRepo.findById(params.reviewId, params.collegeId);
    if (!existing) {
      throw new EntityNotFoundError('Review', params.reviewId);
    }

    const statusByAction: Record<ReviewModerationAction, string> = {
      APPROVE: 'APPROVED',
      HIDE: 'HIDDEN',
      REJECT: 'REJECTED',
      RESTORE: 'APPROVED'
    };

    existing.moderationStatus = statusByAction[params.action];
    const saved = await this.reviewRepo.save(existing);

    await this.eventBus.publish('ReviewModerationDecisionRecorded', {
      eventId: randomUUID(),
      eventName: 'ReviewModerationDecisionRecorded',
      collegeId: saved.collegeId,
      aggregateId: saved.id,
      timestamp: new Date(),
      payload: {
        reviewId: saved.id,
        professorId: saved.professorId,
        collegeId: saved.collegeId,
        action: params.action,
        moderatorUserId: params.moderatorUserId,
        reasonNote: params.reasonNote
      }
    });

    return saved;
  }
}
