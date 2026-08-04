import type { StatisticsRepository } from '../domain/repository.interface.js';
import type { EventBus } from '@college-hub/core';
import { AcademicResourceEvents } from '../domain/events.js';

export interface VoteEventJobData {
  resourceId: string;
  collegeId: string;
  voteType: 'HELPFUL' | 'UNHELPFUL';
}

export class StatisticsWorker {
  constructor(
    private statsRepo: StatisticsRepository,
    private eventBus: EventBus
  ) {}

  public async processVote(job: VoteEventJobData): Promise<{ resourceId: string; bayesianScore: number }> {
    let stats = await this.statsRepo.findByResourceId(job.resourceId, job.collegeId);
    if (!stats) {
      stats = {
        resourceId: job.resourceId,
        collegeId: job.collegeId,
        totalDownloads: 0,
        totalViews: 0,
        helpfulVotes: 0,
        unhelpfulVotes: 0,
        reportCount: 0,
        bookmarkCount: 0,
        bayesianQualityScore: 0.0
      };
    }

    if (job.voteType === 'HELPFUL') {
      stats.helpfulVotes += 1;
    } else {
      stats.unhelpfulVotes += 1;
    }

    const v = stats.helpfulVotes + stats.unhelpfulVotes;
    const m = 5.0;
    const C = 3.0;

    let bayesianScore = 0.0;
    if (v > 0) {
      const R = (stats.helpfulVotes / v) * 5.0;
      bayesianScore = Number(((v / (v + m)) * R + (m / (v + m)) * C).toFixed(2));
    }

    stats.bayesianQualityScore = bayesianScore;
    const saved = await this.statsRepo.save(stats);

    await this.eventBus.publish(AcademicResourceEvents.STATISTICS_UPDATED, {
      eventId: `evt-stat-${Date.now()}`,
      eventType: AcademicResourceEvents.STATISTICS_UPDATED,
      aggregateId: job.resourceId,
      collegeId: job.collegeId,
      timestamp: new Date().toISOString(),
      payload: {
        resourceId: job.resourceId,
        totalDownloads: saved.totalDownloads,
        bayesianQualityScore: saved.bayesianQualityScore
      }
    });

    return { resourceId: job.resourceId, bayesianScore };
  }
}
