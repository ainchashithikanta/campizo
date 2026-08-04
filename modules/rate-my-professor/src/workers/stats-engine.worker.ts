import { randomUUID } from 'node:crypto';
import type { EventBus } from '@college-hub/core';
import { logger } from '@college-hub/logger';
import type { ReviewRepository, ProfessorStatisticsRepository, ProfessorStatisticsEntity } from '../domain/repository.interface.js';

export class StatsEngineWorker {
  private static readonly PRIOR_MEAN = 3.5;
  private static readonly PRIOR_WEIGHT = 5.0;

  constructor(
    private readonly reviewRepo: ReviewRepository,
    private readonly statsRepo: ProfessorStatisticsRepository,
    private readonly eventBus: EventBus
  ) {}

  public async recalculateForProfessor(professorId: string, collegeId: string): Promise<ProfessorStatisticsEntity> {
    logger.info({ professorId, collegeId }, 'Starting asynchronous statistics recalculation engine...');

    const reviews = await this.reviewRepo.findByProfessorId(professorId, collegeId);
    const approvedReviews = reviews.filter((r) => r.moderationStatus === 'APPROVED');

    const totalReviewsCount = approvedReviews.length;

    let star5Count = 0;
    let star4Count = 0;
    let star3Count = 0;
    let star2Count = 0;
    let star1Count = 0;
    let sumRatings = 0;
    let recommendedCount = 0;

    for (const r of approvedReviews) {
      sumRatings += r.overallRating;
      if (r.overallRating >= 3.5) recommendedCount += 1;

      if (r.overallRating >= 4.5) star5Count += 1;
      else if (r.overallRating >= 3.5) star4Count += 1;
      else if (r.overallRating >= 2.5) star3Count += 1;
      else if (r.overallRating >= 1.5) star2Count += 1;
      else star1Count += 1;
    }

    const rawAverageRating = totalReviewsCount > 0 ? Number((sumRatings / totalReviewsCount).toFixed(2)) : 0.0;
    const recommendationPercentage = totalReviewsCount > 0 ? Number(((recommendedCount / totalReviewsCount) * 100).toFixed(1)) : 0.0;

    // Bayesian Rating Formula: (C * m + Sum(R)) / (C + N)
    const bayesianRating = totalReviewsCount > 0
      ? Number(
          (
            (StatsEngineWorker.PRIOR_WEIGHT * StatsEngineWorker.PRIOR_MEAN + sumRatings) /
            (StatsEngineWorker.PRIOR_WEIGHT + totalReviewsCount)
          ).toFixed(2)
        )
      : 0.0;

    const statsEntity: ProfessorStatisticsEntity = {
      professorId,
      collegeId,
      bayesianRating,
      rawAverageRating,
      totalReviewsCount,
      recommendationPercentage,
      star5Count,
      star4Count,
      star3Count,
      star2Count,
      star1Count,
      lastCalculatedAt: new Date()
    };

    const savedStats = await this.statsRepo.save(statsEntity);

    logger.info(
      { professorId, collegeId, bayesianRating, totalReviewsCount, rawAverageRating },
      'Asynchronous statistics recalculation complete. Emitting StatisticsUpdated event.'
    );

    await this.eventBus.publish('StatisticsUpdated', {
      eventId: randomUUID(),
      eventName: 'StatisticsUpdated',
      collegeId,
      aggregateId: professorId,
      timestamp: new Date(),
      payload: {
        professorId,
        collegeId,
        bayesianRating,
        totalReviewsCount
      }
    });

    return savedStats;
  }
}
