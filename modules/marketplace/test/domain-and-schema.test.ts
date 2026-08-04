import { describe, it, expect } from 'vitest';
import {
  marketplaceListings,
  marketplaceOffers,
  marketplaceReservations,
  marketplaceConversations,
  conversationMessages,
  sellerProfiles,
  marketplaceBookmarks,
  marketplaceReports,
  marketplaceCategories,
  marketplaceConditions
} from '../src/schema/marketplace.schema.js';
import {
  assertSameCollege,
  assertVerifiedStudent,
  assertListingPublished,
  assertListingAvailable,
  assertNotSelfPurchase,
  assertSingleActiveReservation,
  assertReservationFromAcceptedOffer,
  assertValidMedia,
  assertValidPrice,
  assertValidStateTransition
} from '../src/domain/invariants.js';
import {
  CrossCollegeOperationError,
  PermissionDeniedError,
  ListingNotPublishedError,
  ListingUnavailableError,
  SelfPurchaseNotAllowedError,
  ReservationAlreadyExistsError,
  InvalidStateTransitionError,
  InvalidMediaError
} from '../src/errors/domain-errors.js';

describe('Campus Marketplace Database Schemas & Entities', () => {
  it('should correctly export all 20 production Drizzle tables and schemas', () => {
    expect(marketplaceListings).toBeDefined();
    expect(marketplaceOffers).toBeDefined();
    expect(marketplaceReservations).toBeDefined();
    expect(marketplaceConversations).toBeDefined();
    expect(conversationMessages).toBeDefined();
    expect(sellerProfiles).toBeDefined();
    expect(marketplaceBookmarks).toBeDefined();
    expect(marketplaceReports).toBeDefined();
    expect(marketplaceCategories).toBeDefined();
    expect(marketplaceConditions).toBeDefined();
  });
});

describe('Campus Marketplace Domain Invariants', () => {
  it('should enforce tenant isolation via assertSameCollege', () => {
    expect(() => assertSameCollege('college-stanford-001', 'college-stanford-001')).not.toThrow();
    expect(() => assertSameCollege('college-stanford-001', 'college-mit-002')).toThrow(CrossCollegeOperationError);
  });

  it('should enforce verified student check', () => {
    expect(() => assertVerifiedStudent(true)).not.toThrow();
    expect(() => assertVerifiedStudent(false)).toThrow(PermissionDeniedError);
  });

  it('should enforce published status invariant', () => {
    expect(() => assertListingPublished('PUBLISHED')).not.toThrow();
    expect(() => assertListingPublished('DRAFT')).toThrow(ListingNotPublishedError);
  });

  it('should enforce listing availability invariant', () => {
    expect(() => assertListingAvailable('PUBLISHED')).not.toThrow();
    expect(() => assertListingAvailable('SOLD')).toThrow(ListingUnavailableError);
    expect(() => assertListingAvailable('RESERVED')).toThrow(ListingUnavailableError);
  });

  it('should enforce self-purchase prohibition', () => {
    expect(() => assertNotSelfPurchase('seller-123', 'buyer-456')).not.toThrow();
    expect(() => assertNotSelfPurchase('user-101', 'user-101')).toThrow(SelfPurchaseNotAllowedError);
  });

  it('should enforce single active reservation invariant', () => {
    expect(() => assertSingleActiveReservation(null)).not.toThrow();
    expect(() => assertSingleActiveReservation(undefined)).not.toThrow();
    expect(() => assertSingleActiveReservation('res-789')).toThrow(ReservationAlreadyExistsError);
  });

  it('should enforce reservation creation strictly from ACCEPTED offer', () => {
    expect(() => assertReservationFromAcceptedOffer('ACCEPTED')).not.toThrow();
    expect(() => assertReservationFromAcceptedOffer('CREATED')).toThrow(InvalidStateTransitionError);
    expect(() => assertReservationFromAcceptedOffer('COUNTERED')).toThrow(InvalidStateTransitionError);
  });

  it('should enforce valid pricing and media rules', () => {
    expect(() => assertValidPrice(900.0)).not.toThrow();
    expect(() => assertValidPrice(-50)).toThrow(InvalidMediaError);

    expect(() => assertValidMedia('https://storage.collegehub.edu/img1.webp', 1)).not.toThrow();
    expect(() => assertValidMedia('', 1)).toThrow(InvalidMediaError);
    expect(() => assertValidMedia('https://storage.collegehub.edu/img1.webp', 7)).toThrow(InvalidMediaError);
  });

  it('should enforce legal listing state machine transitions', () => {
    // Valid transitions
    expect(() => assertValidStateTransition('DRAFT', 'PUBLISHED')).not.toThrow();
    expect(() => assertValidStateTransition('PUBLISHED', 'RESERVED')).not.toThrow();
    expect(() => assertValidStateTransition('PUBLISHED', 'ARCHIVED')).not.toThrow();
    expect(() => assertValidStateTransition('PUBLISHED', 'QUARANTINED')).not.toThrow();
    expect(() => assertValidStateTransition('RESERVED', 'SOLD')).not.toThrow();

    // Illegal transitions
    expect(() => assertValidStateTransition('SOLD', 'PUBLISHED')).toThrow(InvalidStateTransitionError);
    expect(() => assertValidStateTransition('DRAFT', 'SOLD')).toThrow(InvalidStateTransitionError);
  });
});
