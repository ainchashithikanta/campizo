/**
 * Domain Event Definitions for Campus Marketplace
 */

export const MarketplaceEvents = {
  LISTING_CREATED: 'ListingCreated',
  LISTING_PUBLISHED: 'ListingPublished',
  LISTING_UPDATED: 'ListingUpdated',
  LISTING_ARCHIVED: 'ListingArchived',
  LISTING_DELETED: 'ListingDeleted',
  LISTING_RESERVED: 'ListingReserved',
  LISTING_RESERVATION_EXPIRED: 'ListingReservationExpired',
  LISTING_SOLD: 'ListingSold',
  OFFER_CREATED: 'OfferCreated',
  OFFER_COUNTERED: 'OfferCountered',
  OFFER_ACCEPTED: 'OfferAccepted',
  OFFER_REJECTED: 'OfferRejected',
  OFFER_WITHDRAWN: 'OfferWithdrawn',
  OFFER_EXPIRED: 'OfferExpired',
  RESERVATION_CREATED: 'ReservationCreated',
  RESERVATION_CANCELLED: 'ReservationCancelled',
  RESERVATION_EXPIRED: 'ReservationExpired',
  CONVERSATION_CREATED: 'ConversationCreated',
  MESSAGE_SENT: 'MessageSent',
  BOOKMARK_ADDED: 'BookmarkAdded',
  BOOKMARK_REMOVED: 'BookmarkRemoved',
  LISTING_VIEWED: 'ListingViewed',
  LISTING_REPORTED: 'ListingReported',
  SELLER_BADGE_AWARDED: 'SellerBadgeAwarded',
  STATISTICS_UPDATED: 'StatisticsUpdated'
} as const;

export interface BaseDomainEvent<T> {
  eventId: string;
  eventType: string;
  aggregateId: string;
  collegeId: string;
  timestamp: string;
  payload: T;
}

export interface ListingCreatedPayload {
  listingId: string;
  sellerUserId: string;
  categoryCode: string;
  title: string;
  priceInr: number;
}

export interface ListingPublishedPayload {
  listingId: string;
  sellerUserId: string;
  title: string;
  priceInr: number;
}

export interface OfferCreatedPayload {
  offerId: string;
  listingId: string;
  buyerUserId: string;
  sellerUserId: string;
  offeredPriceInr: number;
}

export interface OfferAcceptedPayload {
  offerId: string;
  listingId: string;
  buyerUserId: string;
  sellerUserId: string;
  agreedPriceInr: number;
}

export interface ReservationCreatedPayload {
  reservationId: string;
  listingId: string;
  offerId: string;
  buyerUserId: string;
  sellerUserId: string;
  expiresAt: string;
}

export interface ConversationCreatedPayload {
  conversationId: string;
  listingId: string;
  buyerUserId: string;
  sellerUserId: string;
}

export interface MessageSentPayload {
  messageId: string;
  conversationId: string;
  senderUserId: string;
  messageType: string;
}

export interface ListingReportedPayload {
  reportId: string;
  listingId: string;
  reporterUserId: string;
  reasonCode: string;
  totalReportCount: number;
}

export type ListingCreatedEvent = BaseDomainEvent<ListingCreatedPayload>;
export type ListingPublishedEvent = BaseDomainEvent<ListingPublishedPayload>;
export type OfferCreatedEvent = BaseDomainEvent<OfferCreatedPayload>;
export type OfferAcceptedEvent = BaseDomainEvent<OfferAcceptedPayload>;
export type ReservationCreatedEvent = BaseDomainEvent<ReservationCreatedPayload>;
export type ConversationCreatedEvent = BaseDomainEvent<ConversationCreatedPayload>;
export type MessageSentEvent = BaseDomainEvent<MessageSentPayload>;
export type ListingReportedEvent = BaseDomainEvent<ListingReportedPayload>;
