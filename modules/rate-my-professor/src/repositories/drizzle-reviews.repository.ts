import { eq, and, desc, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { professorReviews, reviewRatingDimensions } from '../schema/rate-my-professor.schema.js';
import type { ReviewEntity, ReviewRepository } from '../domain/repository.interface.js';

const PENDING_MODERATION_STATUSES = ['PENDING_MODERATION', 'HIDDEN', 'REJECTED'];

function mapRow(row: any): ReviewEntity {
  return {
    id: row.id,
    collegeId: row.collegeId,
    professorId: row.professorId,
    courseAssignmentId: row.courseAssignmentId,
    authorUserId: row.authorUserId,
    authorAnonymousToken: row.authorAnonymousToken,
    isAnonymous: row.isAnonymous,
    reviewText: row.reviewText,
    overallRating: Number.parseFloat(row.overallRating),
    moderationStatus: row.moderationStatus,
    helpfulCount: row.helpfulCount,
    unhelpfulCount: row.unhelpfulCount,
    createdAt: row.createdAt
  };
}

export class DrizzleReviewRepository implements ReviewRepository {
  constructor(private readonly db: NodePgDatabase<any>) {}

  public async findById(id: string, collegeId: string): Promise<ReviewEntity | null> {
    const rows = await this.db
      .select()
      .from(professorReviews)
      .where(and(eq(professorReviews.id, id), eq(professorReviews.collegeId, collegeId)))
      .limit(1);

    if (rows.length === 0) return null;
    const row = rows[0]!;
    return mapRow(row);
  }

  public async findAlreadyReviewed(
    authorUserId: string,
    professorId: string,
    courseAssignmentId: string,
    collegeId: string
  ): Promise<boolean> {
    const rows = await this.db
      .select({ id: professorReviews.id })
      .from(professorReviews)
      .where(
        and(
          eq(professorReviews.collegeId, collegeId),
          eq(professorReviews.professorId, professorId),
          eq(professorReviews.authorUserId, authorUserId),
          eq(professorReviews.courseAssignmentId, courseAssignmentId)
        )
      )
      .limit(1);

    return rows.length > 0;
  }

  public async findByProfessorId(
    professorId: string,
    collegeId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<ReviewEntity[]> {
    const limit = options.limit || 20;
    const offset = options.offset || 0;

    const rows = await this.db
      .select()
      .from(professorReviews)
      .where(
        and(
          eq(professorReviews.collegeId, collegeId),
          eq(professorReviews.professorId, professorId),
          eq(professorReviews.moderationStatus, 'APPROVED')
        )
      )
      .orderBy(desc(professorReviews.createdAt))
      .limit(limit)
      .offset(offset);

    return rows.map(mapRow);
  }

  public async listPendingModeration(collegeId: string): Promise<ReviewEntity[]> {
    const rows = await this.db
      .select()
      .from(professorReviews)
      .where(
        and(
          eq(professorReviews.collegeId, collegeId),
          inArray(professorReviews.moderationStatus, PENDING_MODERATION_STATUSES)
        )
      )
      .orderBy(desc(professorReviews.createdAt));

    return rows.map(mapRow);
  }

  public async updateModerationStatus(id: string, collegeId: string, status: string): Promise<void> {
    await this.db
      .update(professorReviews)
      .set({ moderationStatus: status, updatedAt: new Date() })
      .where(and(eq(professorReviews.id, id), eq(professorReviews.collegeId, collegeId)));
  }

  public async save(review: ReviewEntity): Promise<ReviewEntity> {
    await this.db
      .insert(professorReviews)
      .values({
        id: review.id,
        collegeId: review.collegeId,
        professorId: review.professorId,
        courseAssignmentId: review.courseAssignmentId,
        authorUserId: review.authorUserId,
        authorAnonymousToken: review.authorAnonymousToken,
        isAnonymous: review.isAnonymous,
        reviewText: review.reviewText,
        overallRating: review.overallRating.toFixed(2),
        moderationStatus: review.moderationStatus,
        helpfulCount: review.helpfulCount,
        unhelpfulCount: review.unhelpfulCount,
        createdAt: review.createdAt
      })
      .onConflictDoUpdate({
        target: professorReviews.id,
        set: {
          reviewText: review.reviewText,
          overallRating: review.overallRating.toFixed(2),
          moderationStatus: review.moderationStatus,
          helpfulCount: review.helpfulCount,
          unhelpfulCount: review.unhelpfulCount,
          updatedAt: new Date()
        }
      });

    if (review.dimensions && Object.keys(review.dimensions).length > 0) {
      await this.db.delete(reviewRatingDimensions).where(eq(reviewRatingDimensions.reviewId, review.id));
      await this.db.insert(reviewRatingDimensions).values(
        Object.entries(review.dimensions).map(([dimensionKey, score]) => ({
          reviewId: review.id,
          dimensionKey,
          score: score.toFixed(2),
          collegeId: review.collegeId
        }))
      );
    }

    return review;
  }
}
