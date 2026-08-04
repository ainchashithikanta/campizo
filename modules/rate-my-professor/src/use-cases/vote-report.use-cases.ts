import { randomUUID } from 'node:crypto';
import type { EventBus } from '@college-hub/core';
import type { ReviewRepository } from '../domain/repository.interface.js';
import { EntityNotFoundError } from '../errors/application-errors.js';

export class VoteHelpfulUseCase {
  constructor(
    private readonly reviewRepo: ReviewRepository,
    private readonly eventBus: EventBus
  ) {}

  public async execute(params: {
    reviewId: string;
    voterUserId: string;
    collegeId: string;
    voteType: 'HELPFUL' | 'UNHELPFUL';
  }): Promise<void> {
    const review = await this.reviewRepo.findById(params.reviewId, params.collegeId);
    if (!review) {
      throw new EntityNotFoundError('Review', params.reviewId);
    }

    if (review.authorUserId === params.voterUserId) {
      throw new Error('Authors cannot vote on their own reviews.');
    }

    if (params.voteType === 'HELPFUL') {
      review.helpfulCount += 1;
    } else {
      review.unhelpfulCount += 1;
    }

    await this.reviewRepo.save(review);

    await this.eventBus.publish('ReviewVoteAdded', {
      eventId: randomUUID(),
      eventName: 'ReviewVoteAdded',
      collegeId: params.collegeId,
      aggregateId: params.reviewId,
      timestamp: new Date(),
      payload: {
        reviewId: params.reviewId,
        voterUserId: params.voterUserId,
        voteType: params.voteType
      }
    });
  }
}

export class RemoveVoteUseCase {
  constructor(
    private readonly reviewRepo: ReviewRepository,
    private readonly eventBus: EventBus
  ) {}

  public async execute(params: { reviewId: string; voterUserId: string; collegeId: string }): Promise<void> {
    const review = await this.reviewRepo.findById(params.reviewId, params.collegeId);
    if (!review) {
      throw new EntityNotFoundError('Review', params.reviewId);
    }

    if (review.helpfulCount > 0) {
      review.helpfulCount -= 1;
    }

    await this.reviewRepo.save(review);

    await this.eventBus.publish('ReviewVoteRemoved', {
      eventId: randomUUID(),
      eventName: 'ReviewVoteRemoved',
      collegeId: params.collegeId,
      aggregateId: params.reviewId,
      timestamp: new Date(),
      payload: {
        reviewId: params.reviewId,
        voterUserId: params.voterUserId
      }
    });
  }
}

export class ReportReviewUseCase {
  constructor(
    private readonly reviewRepo: ReviewRepository,
    private readonly eventBus: EventBus
  ) {}

  public async execute(params: {
    reviewId: string;
    reporterUserId: string;
    collegeId: string;
    reason: string;
    _details?: string;
  }): Promise<void> {
    const review = await this.reviewRepo.findById(params.reviewId, params.collegeId);
    if (!review) {
      throw new EntityNotFoundError('Review', params.reviewId);
    }

    await this.eventBus.publish('ReviewReported', {
      eventId: randomUUID(),
      eventName: 'ReviewReported',
      collegeId: params.collegeId,
      aggregateId: params.reviewId,
      timestamp: new Date(),
      payload: {
        reviewId: params.reviewId,
        reporterUserId: params.reporterUserId,
        reason: params.reason,
        reportCount: 1
      }
    });
  }
}
