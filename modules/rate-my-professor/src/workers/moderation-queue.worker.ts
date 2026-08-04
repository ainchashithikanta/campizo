import { randomUUID } from 'node:crypto';
import type { EventBus } from '@college-hub/core';
import { logger } from '@college-hub/logger';
import type { ReviewRepository } from '../domain/repository.interface.js';

export interface ModerationEvaluationResult {
  reviewId: string;
  isAutoApproved: boolean;
  riskScore: number;
  flaggedReasons: string[];
}

export class ModerationQueueWorker {
  private static readonly PROFANITY_PATTERNS = [/fuck/i, /shit/i, /bitch/i, /asshole/i, /crap/i];
  private static readonly PHONE_PATTERN = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/;
  private static readonly EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

  constructor(
    private readonly reviewRepo: ReviewRepository,
    private readonly eventBus: EventBus
  ) {}

  public async evaluateReviewRisk(reviewId: string, collegeId: string): Promise<ModerationEvaluationResult> {
    logger.info({ reviewId, collegeId }, 'Starting automated pre-moderation risk scanning...');

    const review = await this.reviewRepo.findById(reviewId, collegeId);
    if (!review) {
      logger.warn({ reviewId, collegeId }, 'Review not found for risk evaluation.');
      return { reviewId, isAutoApproved: false, riskScore: 1.0, flaggedReasons: ['REVIEW_NOT_FOUND'] };
    }

    const flaggedReasons: string[] = [];
    let riskScore = 0.0;

    // 1. Scan for profanity
    for (const pattern of ModerationQueueWorker.PROFANITY_PATTERNS) {
      if (pattern.test(review.reviewText)) {
        flaggedReasons.push('PROFANITY_DETECTED');
        riskScore += 0.5;
        break;
      }
    }

    // 2. Scan for phone numbers
    if (ModerationQueueWorker.PHONE_PATTERN.test(review.reviewText)) {
      flaggedReasons.push('PHONE_NUMBER_DETECTED');
      riskScore += 0.8;
    }

    // 3. Scan for emails
    if (ModerationQueueWorker.EMAIL_PATTERN.test(review.reviewText)) {
      flaggedReasons.push('EMAIL_ADDRESS_DETECTED');
      riskScore += 0.6;
    }

    const isAutoApproved = riskScore < 0.5;

    if (isAutoApproved) {
      review.moderationStatus = 'APPROVED';
      await this.reviewRepo.save(review);

      logger.info({ reviewId, collegeId, riskScore }, 'Review passed risk evaluation. Auto-approved.');

      await this.eventBus.publish('ReviewPublished', {
        eventId: randomUUID(),
        eventName: 'ReviewPublished',
        collegeId,
        aggregateId: reviewId,
        timestamp: new Date(),
        payload: {
          reviewId,
          professorId: review.professorId,
          collegeId,
          overallRating: review.overallRating
        }
      });
    } else {
      review.moderationStatus = 'PENDING_MODERATION';
      await this.reviewRepo.save(review);

      logger.warn({ reviewId, collegeId, riskScore, flaggedReasons }, 'Review failed risk evaluation. Queued for moderator review.');

      await this.eventBus.publish('ReviewReported', {
        eventId: randomUUID(),
        eventName: 'ReviewReported',
        collegeId,
        aggregateId: reviewId,
        timestamp: new Date(),
        payload: {
          reviewId,
          reporterUserId: 'system-risk-scanner',
          reason: `SYSTEM_FLAGGED: ${flaggedReasons.join(', ')}`,
          reportCount: 1
        }
      });
    }

    return {
      reviewId,
      isAutoApproved,
      riskScore,
      flaggedReasons
    };
  }
}
