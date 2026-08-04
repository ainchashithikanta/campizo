export interface MarketplaceListingEntity {
  id: string;
  collegeId: string;
  sellerUserId: string;
  categoryCode: string;
  title: string;
  slug: string;
  description?: string | null;
  conditionCode: string;
  listingType: string;
  priceInr: number;
  isNegotiable: boolean;
  pickupLocationName: string;
  status: string;
  currentReservationId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface ListingMediaEntity {
  id: string;
  listingId: string;
  storageKey: string;
  mediaUrl: string;
  positionOrder: number;
  isPrimary: boolean;
}

export interface OfferEntity {
  id: string;
  collegeId: string;
  listingId: string;
  buyerUserId: string;
  sellerUserId: string;
  offeredPriceInr: number;
  counterPriceInr?: number | null;
  status: string;
  expiresAt: Date;
  createdAt?: Date;
}

export interface ReservationEntity {
  id: string;
  collegeId: string;
  listingId: string;
  offerId: string;
  buyerUserId: string;
  sellerUserId: string;
  startsAt: Date;
  expiresAt: Date;
  status: string;
  cancelReason?: string | null;
}

export interface ConversationEntity {
  id: string;
  collegeId: string;
  listingId: string;
  buyerUserId: string;
  sellerUserId: string;
  lastMessageAt: Date;
}

export interface MessageEntity {
  id: string;
  conversationId: string;
  senderUserId: string;
  messageType: string;
  content: string;
  offerId?: string | null;
  isRead: boolean;
  createdAt?: Date;
}

export interface SellerProfileEntity {
  id: string;
  collegeId: string;
  userId: string;
  isVerifiedStudent: boolean;
  totalListingsPosted: number;
  successfulSalesCount: number;
  cancelledReservationsCount: number;
  responseRatePercent: number;
  badgeLevel: string;
}

export interface MarketplaceStatisticsEntity {
  listingId: string;
  collegeId: string;
  totalViews: number;
  totalBookmarks: number;
  totalOffers: number;
  popularityScore: number;
  lastCalculatedAt?: Date;
}

export interface BookmarkEntity {
  id: string;
  collegeId: string;
  userId: string;
  listingId: string;
  createdAt?: Date;
}

export interface ReportEntity {
  id: string;
  collegeId: string;
  reporterUserId: string;
  listingId: string;
  reasonCode: string;
  details?: string | null;
  createdAt?: Date;
}

export interface MarketplaceListingRepository {
  findById(id: string, collegeId: string): Promise<MarketplaceListingEntity | null>;
  findBySlug(slug: string, collegeId: string): Promise<MarketplaceListingEntity | null>;
  findByCategory(categoryCode: string, collegeId: string): Promise<MarketplaceListingEntity[]>;
  save(listing: MarketplaceListingEntity): Promise<MarketplaceListingEntity>;
  saveMedia(media: ListingMediaEntity): Promise<ListingMediaEntity>;
  findMediaByListing(listingId: string): Promise<ListingMediaEntity[]>;
  delete(id: string, collegeId: string): Promise<boolean>;
}

export interface OfferRepository {
  findById(id: string, collegeId: string): Promise<OfferEntity | null>;
  findActiveByBuyerAndListing(buyerUserId: string, listingId: string, collegeId: string): Promise<OfferEntity | null>;
  save(offer: OfferEntity): Promise<OfferEntity>;
}

export interface ReservationRepository {
  findById(id: string, collegeId: string): Promise<ReservationEntity | null>;
  findActiveByListing(listingId: string, collegeId: string): Promise<ReservationEntity | null>;
  save(reservation: ReservationEntity): Promise<ReservationEntity>;
}

export interface ConversationRepository {
  findById(id: string, collegeId: string): Promise<ConversationEntity | null>;
  findByBuyerAndListing(buyerUserId: string, listingId: string, collegeId: string): Promise<ConversationEntity | null>;
  saveConversation(conversation: ConversationEntity): Promise<ConversationEntity>;
  saveMessage(message: MessageEntity): Promise<MessageEntity>;
  findMessagesByConversation(conversationId: string): Promise<MessageEntity[]>;
}

export interface SellerProfileRepository {
  findByUser(userId: string, collegeId: string): Promise<SellerProfileEntity | null>;
  save(profile: SellerProfileEntity): Promise<SellerProfileEntity>;
}

export interface MarketplaceStatisticsRepository {
  findByListing(listingId: string, collegeId: string): Promise<MarketplaceStatisticsEntity | null>;
  save(stats: MarketplaceStatisticsEntity): Promise<MarketplaceStatisticsEntity>;
}

export interface BookmarkRepository {
  findByUserAndListing(userId: string, listingId: string, collegeId: string): Promise<BookmarkEntity | null>;
  save(bookmark: BookmarkEntity): Promise<BookmarkEntity>;
  delete(userId: string, listingId: string, collegeId: string): Promise<boolean>;
}

export interface ReportRepository {
  findByReporterAndListing(reporterUserId: string, listingId: string, collegeId: string): Promise<ReportEntity | null>;
  countByListing(listingId: string, collegeId: string): Promise<number>;
  save(report: ReportEntity): Promise<ReportEntity>;
}

export interface AuditRepository {
  saveLog(log: {
    id: string;
    collegeId: string;
    aggregateId: string;
    aggregateType: string;
    action: string;
    actorUserId: string;
    payloadJson: string;
  }): Promise<void>;
}
