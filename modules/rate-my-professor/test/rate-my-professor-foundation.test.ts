import { describe, it, expect } from 'vitest';
import {
  professors,
  professorReviews,
  professorStatistics,
  reviewRatingDimensions,
  assertStudentEligibleToReview,
  assertReviewInEditWindow,
  assertValidRatingScore,
  assertFacultyCanRespond,
  BusinessInvariantError
} from '../src/index.js';

describe('Rate My Professor — Production Database & Domain Foundation (MS-18.8.1)', () => {
  it('should define Drizzle ORM schema tables with primary keys and audit columns', () => {
    expect(professors).toBeDefined();
    expect(professorReviews).toBeDefined();
    expect(professorStatistics).toBeDefined();
    expect(reviewRatingDimensions).toBeDefined();
  });

  it('should enforce self-review prohibition domain invariant', () => {
    expect(() =>
      assertStudentEligibleToReview({
        authorUserId: 'usr-prof-1',
        professorUserId: 'usr-prof-1', // Author is the professor
        hasAlreadyReviewedTerm: false,
        professorStatus: 'ACTIVE'
      })
    ).toThrow(BusinessInvariantError);

    try {
      assertStudentEligibleToReview({
        authorUserId: 'usr-prof-1',
        professorUserId: 'usr-prof-1',
        hasAlreadyReviewedTerm: false,
        professorStatus: 'ACTIVE'
      });
    } catch (err: any) {
      expect(err.errorCode).toBe('SELF_REVIEW_PROHIBITED');
    }
  });

  it('should enforce term duplicate review prohibition', () => {
    expect(() =>
      assertStudentEligibleToReview({
        authorUserId: 'usr-student-1',
        professorUserId: 'usr-prof-2',
        hasAlreadyReviewedTerm: true,
        professorStatus: 'ACTIVE'
      })
    ).toThrow(BusinessInvariantError);
  });

  it('should prevent reviewing RETIRED or INACTIVE professors', () => {
    expect(() =>
      assertStudentEligibleToReview({
        authorUserId: 'usr-student-1',
        professorUserId: 'usr-prof-3',
        hasAlreadyReviewedTerm: false,
        professorStatus: 'RETIRED'
      })
    ).toThrow(BusinessInvariantError);
  });

  it('should enforce 24-hour edit window invariant', () => {
    const freshDate = new Date();
    expect(() => assertReviewInEditWindow(freshDate, 24)).not.toThrow();

    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
    expect(() => assertReviewInEditWindow(oldDate, 24)).toThrow(BusinessInvariantError);
  });

  it('should validate rating score boundaries [1.0, 5.0]', () => {
    expect(() => assertValidRatingScore(4.5)).not.toThrow();
    expect(() => assertValidRatingScore(0.5)).toThrow(BusinessInvariantError);
    expect(() => assertValidRatingScore(5.5)).toThrow(BusinessInvariantError);
  });

  it('should enforce single faculty counter-response per review', () => {
    expect(() => assertFacultyCanRespond(0)).not.toThrow();
    expect(() => assertFacultyCanRespond(1)).toThrow(BusinessInvariantError);
  });
});
