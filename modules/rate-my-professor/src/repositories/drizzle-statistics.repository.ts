import { eq, and } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { professorStatistics } from '../schema/rate-my-professor.schema.js';
import type { ProfessorStatisticsEntity, ProfessorStatisticsRepository } from '../domain/repository.interface.js';

export class DrizzleProfessorStatisticsRepository implements ProfessorStatisticsRepository {
  constructor(private readonly db: NodePgDatabase<any>) {}

  public async findByProfessorId(professorId: string, collegeId: string): Promise<ProfessorStatisticsEntity | null> {
    const rows = await this.db
      .select()
      .from(professorStatistics)
      .where(and(eq(professorStatistics.professorId, professorId), eq(professorStatistics.collegeId, collegeId)))
      .limit(1);

    if (rows.length === 0) return null;
    const row = rows[0]!;

    return {
      professorId: row.professorId,
      collegeId: row.collegeId,
      bayesianRating: Number.parseFloat(row.bayesianRating),
      rawAverageRating: Number.parseFloat(row.rawAverageRating),
      totalReviewsCount: row.totalReviewsCount,
      recommendationPercentage: Number.parseFloat(row.recommendationPercentage),
      star5Count: row.star5Count,
      star4Count: row.star4Count,
      star3Count: row.star3Count,
      star2Count: row.star2Count,
      star1Count: row.star1Count,
      lastCalculatedAt: row.lastCalculatedAt
    };
  }

  public async save(stats: ProfessorStatisticsEntity): Promise<ProfessorStatisticsEntity> {
    await this.db
      .insert(professorStatistics)
      .values({
        professorId: stats.professorId,
        collegeId: stats.collegeId,
        bayesianRating: stats.bayesianRating.toFixed(2),
        rawAverageRating: stats.rawAverageRating.toFixed(2),
        totalReviewsCount: stats.totalReviewsCount,
        recommendationPercentage: stats.recommendationPercentage.toFixed(2),
        star5Count: stats.star5Count,
        star4Count: stats.star4Count,
        star3Count: stats.star3Count,
        star2Count: stats.star2Count,
        star1Count: stats.star1Count,
        lastCalculatedAt: stats.lastCalculatedAt
      })
      .onConflictDoUpdate({
        target: professorStatistics.professorId,
        set: {
          bayesianRating: stats.bayesianRating.toFixed(2),
          rawAverageRating: stats.rawAverageRating.toFixed(2),
          totalReviewsCount: stats.totalReviewsCount,
          recommendationPercentage: stats.recommendationPercentage.toFixed(2),
          star5Count: stats.star5Count,
          star4Count: stats.star4Count,
          star3Count: stats.star3Count,
          star2Count: stats.star2Count,
          star1Count: stats.star1Count,
          lastCalculatedAt: new Date()
        }
      });

    return stats;
  }
}
