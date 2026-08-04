export abstract class DomainError extends Error {
  public abstract readonly code: string;
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ListingAlreadySoldError extends DomainError {
  public readonly code = 'LISTING_ALREADY_SOLD';
}

export class ListingNotPublishedError extends DomainError {
  public readonly code = 'LISTING_NOT_PUBLISHED';
}

export class ListingUnavailableError extends DomainError {
  public readonly code = 'LISTING_UNAVAILABLE';
}

export class OfferAlreadyExistsError extends DomainError {
  public readonly code = 'OFFER_ALREADY_EXISTS';
}

export class ReservationAlreadyExistsError extends DomainError {
  public readonly code = 'RESERVATION_ALREADY_EXISTS';
}

export class ReservationExpiredError extends DomainError {
  public readonly code = 'RESERVATION_EXPIRED';
}

export class DuplicateConversationError extends DomainError {
  public readonly code = 'DUPLICATE_CONVERSATION';
}

export class DuplicateBookmarkError extends DomainError {
  public readonly code = 'DUPLICATE_BOOKMARK';
}

export class DuplicateReportError extends DomainError {
  public readonly code = 'DUPLICATE_REPORT';
}

export class SelfPurchaseNotAllowedError extends DomainError {
  public readonly code = 'SELF_PURCHASE_NOT_ALLOWED';
}

export class CrossCollegeOperationError extends DomainError {
  public readonly code = 'CROSS_COLLEGE_OPERATION';
}

export class InvalidStateTransitionError extends DomainError {
  public readonly code = 'INVALID_STATE_TRANSITION';
}

export class InvalidMediaError extends DomainError {
  public readonly code = 'INVALID_MEDIA';
}

export class PermissionDeniedError extends DomainError {
  public readonly code = 'PERMISSION_DENIED';
}
