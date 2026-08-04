import { eq, and, desc } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { professorReviews } from '../schema/rate-my-professor.schema.js';
import type { ReviewEntity, ReviewRepository } from '../domain/repository.interface.js';

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

    return rows.map((row) => ({
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
    }));
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

    return review;
  }
}
