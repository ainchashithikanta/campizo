export class ApplicationError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export class DuplicateReviewError extends ApplicationError {
  constructor(message = 'You have already submitted a review for this professor in the current academic term.') {
    super(message, 'DUPLICATE_REVIEW_FOR_TERM');
  }
}

export class EditWindowExpiredError extends ApplicationError {
  constructor(message = 'Reviews can only be edited or deleted within 24 hours of submission.') {
    super(message, 'EDIT_WINDOW_EXPIRED');
  }
}

export class ProfessorInactiveError extends ApplicationError {
  constructor(message = 'Cannot submit reviews for inactive or retired professors.') {
    super(message, 'PROFESSOR_INACTIVE');
  }
}

export class DuplicateVoteError extends ApplicationError {
  constructor(message = 'You have already voted on this review.') {
    super(message, 'DUPLICATE_VOTE');
  }
}

export class DuplicateReportError extends ApplicationError {
  constructor(message = 'You have already reported this review.') {
    super(message, 'DUPLICATE_REPORT');
  }
}

export class UnauthorizedFacultyResponseError extends ApplicationError {
  constructor(message = 'Only the verified professor or authorized faculty can respond to reviews.') {
    super(message, 'UNAUTHORIZED_FACULTY_RESPONSE');
  }
}

export class EntityNotFoundError extends ApplicationError {
  constructor(entityName: string, id: string) {
    super(`${entityName} with ID '${id}' was not found.`, 'ENTITY_NOT_FOUND');
  }
}
