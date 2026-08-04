export class BusinessInvariantError extends Error {
  constructor(
    message: string,
    public readonly errorCode: string
  ) {
    super(message);
    this.name = 'BusinessInvariantError';
  }
}

export function assertStudentEligibleToReview(params: {
  authorUserId: string;
  professorUserId?: string | undefined;
  hasAlreadyReviewedTerm: boolean;
  professorStatus: string;
}): void {
  if (params.professorUserId && params.authorUserId === params.professorUserId) {
    throw new BusinessInvariantError('Professors cannot submit reviews for themselves.', 'SELF_REVIEW_PROHIBITED');
  }

  if (params.hasAlreadyReviewedTerm) {
    throw new BusinessInvariantError(
      'You have already submitted a review for this professor in the current academic term.',
      'DUPLICATE_REVIEW_FOR_TERM'
    );
  }

  if (params.professorStatus === 'RETIRED' || params.professorStatus === 'INACTIVE') {
    throw new BusinessInvariantError(
      `Cannot submit review for professor with status '${params.professorStatus}'.`,
      'PROFESSOR_NOT_ACCEPTING_REVIEWS'
    );
  }
}

export function assertReviewInEditWindow(createdAt: Date, editWindowHours = 24): void {
  const elapsedMs = Date.now() - createdAt.getTime();
  const allowedMs = editWindowHours * 60 * 60 * 1000;

  if (elapsedMs > allowedMs) {
    throw new BusinessInvariantError(
      `Reviews can only be edited or deleted within ${editWindowHours} hours of submission.`,
      'EDIT_WINDOW_EXPIRED'
    );
  }
}

export function assertValidRatingScore(score: number): void {
  if (score < 1.0 || score > 5.0) {
    throw new BusinessInvariantError('Rating score must be between 1.00 and 5.00.', 'INVALID_RATING_SCORE');
  }
}

export function assertFacultyCanRespond(existingResponseCount: number, maxAllowed = 1): void {
  if (existingResponseCount >= maxAllowed) {
    throw new BusinessInvariantError(
      'A faculty response has already been published for this review.',
      'DUPLICATE_FACULTY_RESPONSE'
    );
  }
}
