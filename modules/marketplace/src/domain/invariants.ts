import {
  CrossCollegeOperationError,
  PermissionDeniedError,
  ListingNotPublishedError,
  ListingUnavailableError,
  SelfPurchaseNotAllowedError,
  ReservationAlreadyExistsError,
  InvalidStateTransitionError,
  InvalidMediaError
} from '../errors/domain-errors.js';

export function assertSameCollege(targetCollegeId: string, requestCollegeId: string): void {
  if (targetCollegeId !== requestCollegeId) {
    throw new CrossCollegeOperationError(
      `Cross-college operation prohibited. Target college [${targetCollegeId}] does not match request college [${requestCollegeId}].`
    );
  }
}

export function assertVerifiedStudent(isVerifiedStudent: boolean): void {
  if (!isVerifiedStudent) {
    throw new PermissionDeniedError(
      'Only verified students with valid college credentials may perform marketplace operations.'
    );
  }
}

export function assertListingPublished(status: string): void {
  if (status !== 'PUBLISHED') {
    throw new ListingNotPublishedError(`Listing status [${status}] is not PUBLISHED.`);
  }
}

export function assertListingAvailable(status: string): void {
  if (status === 'SOLD') {
    throw new ListingUnavailableError('Listing is already SOLD.');
  }
  if (status === 'RESERVED') {
    throw new ListingUnavailableError('Listing is currently RESERVED for another buyer.');
  }
  if (status !== 'PUBLISHED') {
    throw new ListingUnavailableError(`Listing status [${status}] is unavailable.`);
  }
}

export function assertNotSelfPurchase(sellerUserId: string, buyerUserId: string): void {
  if (sellerUserId === buyerUserId) {
    throw new SelfPurchaseNotAllowedError('Sellers cannot make offers or purchase their own listings.');
  }
}

export function assertSingleActiveReservation(currentReservationId?: string | null): void {
  if (currentReservationId) {
    throw new ReservationAlreadyExistsError(`Listing already has an active reservation [${currentReservationId}].`);
  }
}

export function assertReservationFromAcceptedOffer(offerStatus: string): void {
  if (offerStatus !== 'ACCEPTED') {
    throw new InvalidStateTransitionError(
      `Reservations can only be spawned from ACCEPTED offers. Current status: [${offerStatus}].`
    );
  }
}

export function assertValidPrice(priceInr: number): void {
  if (priceInr < 0) {
    throw new InvalidMediaError(`Listing price [₹${priceInr}] cannot be negative.`);
  }
}

export function assertValidMedia(mediaUrl: string, positionOrder: number): void {
  if (!mediaUrl || mediaUrl.trim().length === 0) {
    throw new InvalidMediaError('Media URL cannot be empty.');
  }
  if (positionOrder < 1 || positionOrder > 6) {
    throw new InvalidMediaError(`Media position order [${positionOrder}] must be between 1 and 6.`);
  }
}

export function assertValidStateTransition(currentStatus: string, targetStatus: string): void {
  const allowedTransitions: Record<string, string[]> = {
    DRAFT: ['PUBLISHED', 'DELETED'],
    PUBLISHED: ['RESERVED', 'ARCHIVED', 'QUARANTINED', 'EXPIRED', 'DELETED'],
    RESERVED: ['PUBLISHED', 'SOLD', 'DELETED'],
    ARCHIVED: ['PUBLISHED', 'DELETED'],
    QUARANTINED: ['PUBLISHED', 'DELETED'],
    EXPIRED: ['PUBLISHED', 'DELETED'],
    SOLD: []
  };

  const validTargets = allowedTransitions[currentStatus] || [];
  if (!validTargets.includes(targetStatus)) {
    throw new InvalidStateTransitionError(
      `Illegal listing state transition from [${currentStatus}] to [${targetStatus}].`
    );
  }
}
