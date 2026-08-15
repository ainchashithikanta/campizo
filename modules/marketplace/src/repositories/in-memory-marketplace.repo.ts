import {
  MarketplaceListingRepository,
  OfferRepository,
  ReservationRepository,
  ConversationRepository,
  SellerProfileRepository,
  MarketplaceStatisticsRepository,
  BookmarkRepository,
  ReportRepository,
  AuditRepository,
  MarketplaceListingEntity,
  ListingMediaEntity,
  OfferEntity,
  ReservationEntity,
  ConversationEntity,
  MessageEntity,
  SellerProfileEntity,
  MarketplaceStatisticsEntity,
  BookmarkEntity,
  ReportEntity
} from '../domain/repository.interface.js';

export class InMemoryMarketplaceListingRepository implements MarketplaceListingRepository {
  private listings = new Map<string, MarketplaceListingEntity>();
  private mediaList = new Map<string, ListingMediaEntity>();

  async findById(id: string, collegeId: string): Promise<MarketplaceListingEntity | null> {
    const item = this.listings.get(id);
    if (!item || item.collegeId !== collegeId || item.deletedAt) return null;
    return { ...item };
  }

  async findBySlug(slug: string, collegeId: string): Promise<MarketplaceListingEntity | null> {
    for (const item of this.listings.values()) {
      if (item.slug === slug && item.collegeId === collegeId && !item.deletedAt) {
        return { ...item };
      }
    }
    return null;
  }

  async findByCategory(categoryCode: string, collegeId: string): Promise<MarketplaceListingEntity[]> {
    const results: MarketplaceListingEntity[] = [];
    for (const item of this.listings.values()) {
      if (item.categoryCode === categoryCode && item.collegeId === collegeId && !item.deletedAt) {
        results.push({ ...item });
      }
    }
    return results;
  }

  async listModerationQueue(collegeId: string): Promise<MarketplaceListingEntity[]> {
    const results: MarketplaceListingEntity[] = [];
    for (const item of this.listings.values()) {
      if (item.collegeId === collegeId && !item.deletedAt && item.status === 'QUARANTINED') {
        results.push({ ...item });
      }
    }
    return results;
  }

  async save(listing: MarketplaceListingEntity): Promise<MarketplaceListingEntity> {
    this.listings.set(listing.id, { ...listing });
    return { ...listing };
  }

  async saveMedia(media: ListingMediaEntity): Promise<ListingMediaEntity> {
    this.mediaList.set(media.id, { ...media });
    return { ...media };
  }

  async findMediaByListing(listingId: string): Promise<ListingMediaEntity[]> {
    const results: ListingMediaEntity[] = [];
    for (const item of this.mediaList.values()) {
      if (item.listingId === listingId) {
        results.push({ ...item });
      }
    }
    return results.sort((a, b) => a.positionOrder - b.positionOrder);
  }

  async delete(id: string, collegeId: string): Promise<boolean> {
    const item = this.listings.get(id);
    if (!item || item.collegeId !== collegeId) return false;
    item.deletedAt = new Date();
    this.listings.set(id, item);
    return true;
  }
}

export class InMemoryOfferRepository implements OfferRepository {
  private offers = new Map<string, OfferEntity>();

  async findById(id: string, collegeId: string): Promise<OfferEntity | null> {
    const item = this.offers.get(id);
    if (!item || item.collegeId !== collegeId) return null;
    return { ...item };
  }

  async findActiveByBuyerAndListing(
    buyerUserId: string,
    listingId: string,
    collegeId: string
  ): Promise<OfferEntity | null> {
    for (const item of this.offers.values()) {
      if (
        item.buyerUserId === buyerUserId &&
        item.listingId === listingId &&
        item.collegeId === collegeId &&
        ['CREATED', 'COUNTERED'].includes(item.status)
      ) {
        return { ...item };
      }
    }
    return null;
  }

  async save(offer: OfferEntity): Promise<OfferEntity> {
    this.offers.set(offer.id, { ...offer });
    return { ...offer };
  }
}

export class InMemoryReservationRepository implements ReservationRepository {
  private reservations = new Map<string, ReservationEntity>();

  async findById(id: string, collegeId: string): Promise<ReservationEntity | null> {
    const item = this.reservations.get(id);
    if (!item || item.collegeId !== collegeId) return null;
    return { ...item };
  }

  async findActiveByListing(listingId: string, collegeId: string): Promise<ReservationEntity | null> {
    for (const item of this.reservations.values()) {
      if (item.listingId === listingId && item.collegeId === collegeId && item.status === 'ACTIVE') {
        return { ...item };
      }
    }
    return null;
  }

  async save(reservation: ReservationEntity): Promise<ReservationEntity> {
    this.reservations.set(reservation.id, { ...reservation });
    return { ...reservation };
  }
}

export class InMemoryConversationRepository implements ConversationRepository {
  private conversations = new Map<string, ConversationEntity>();
  private messages = new Map<string, MessageEntity>();

  async findById(id: string, collegeId: string): Promise<ConversationEntity | null> {
    const item = this.conversations.get(id);
    if (!item || item.collegeId !== collegeId) return null;
    return { ...item };
  }

  async findByBuyerAndListing(
    buyerUserId: string,
    listingId: string,
    collegeId: string
  ): Promise<ConversationEntity | null> {
    for (const item of this.conversations.values()) {
      if (item.buyerUserId === buyerUserId && item.listingId === listingId && item.collegeId === collegeId) {
        return { ...item };
      }
    }
    return null;
  }

  async saveConversation(conversation: ConversationEntity): Promise<ConversationEntity> {
    this.conversations.set(conversation.id, { ...conversation });
    return { ...conversation };
  }

  async saveMessage(message: MessageEntity): Promise<MessageEntity> {
    this.messages.set(message.id, { ...message });
    return { ...message };
  }

  async findMessagesByConversation(conversationId: string): Promise<MessageEntity[]> {
    const results: MessageEntity[] = [];
    for (const item of this.messages.values()) {
      if (item.conversationId === conversationId) {
        results.push({ ...item });
      }
    }
    return results.sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
  }
}

export class InMemorySellerProfileRepository implements SellerProfileRepository {
  private profiles = new Map<string, SellerProfileEntity>();

  async findByUser(userId: string, collegeId: string): Promise<SellerProfileEntity | null> {
    const key = `${collegeId}:${userId}`;
    const item = this.profiles.get(key);
    if (!item) return null;
    return { ...item };
  }

  async save(profile: SellerProfileEntity): Promise<SellerProfileEntity> {
    const key = `${profile.collegeId}:${profile.userId}`;
    this.profiles.set(key, { ...profile });
    return { ...profile };
  }
}

export class InMemoryMarketplaceStatisticsRepository implements MarketplaceStatisticsRepository {
  private statsMap = new Map<string, MarketplaceStatisticsEntity>();

  async findByListing(listingId: string, collegeId: string): Promise<MarketplaceStatisticsEntity | null> {
    const item = this.statsMap.get(listingId);
    if (!item || item.collegeId !== collegeId) return null;
    return { ...item };
  }

  async save(stats: MarketplaceStatisticsEntity): Promise<MarketplaceStatisticsEntity> {
    this.statsMap.set(stats.listingId, { ...stats });
    return { ...stats };
  }
}

export class InMemoryBookmarkRepository implements BookmarkRepository {
  private bookmarks = new Map<string, BookmarkEntity>();

  async findByUserAndListing(userId: string, listingId: string, collegeId: string): Promise<BookmarkEntity | null> {
    const key = `${collegeId}:${userId}:${listingId}`;
    const item = this.bookmarks.get(key);
    if (!item) return null;
    return { ...item };
  }

  async save(bookmark: BookmarkEntity): Promise<BookmarkEntity> {
    const key = `${bookmark.collegeId}:${bookmark.userId}:${bookmark.listingId}`;
    this.bookmarks.set(key, { ...bookmark });
    return { ...bookmark };
  }

  async delete(userId: string, listingId: string, collegeId: string): Promise<boolean> {
    const key = `${collegeId}:${userId}:${listingId}`;
    return this.bookmarks.delete(key);
  }
}

export class InMemoryReportRepository implements ReportRepository {
  private reports = new Map<string, ReportEntity>();

  async findByReporterAndListing(
    reporterUserId: string,
    listingId: string,
    collegeId: string
  ): Promise<ReportEntity | null> {
    const key = `${collegeId}:${reporterUserId}:${listingId}`;
    const item = this.reports.get(key);
    if (!item) return null;
    return { ...item };
  }

  async countByListing(listingId: string, collegeId: string): Promise<number> {
    let count = 0;
    for (const item of this.reports.values()) {
      if (item.listingId === listingId && item.collegeId === collegeId) {
        count++;
      }
    }
    return count;
  }

  async save(report: ReportEntity): Promise<ReportEntity> {
    const key = `${report.collegeId}:${report.reporterUserId}:${report.listingId}`;
    this.reports.set(key, { ...report });
    return { ...report };
  }
}

export class InMemoryAuditRepository implements AuditRepository {
  public logs: Array<{
    id: string;
    collegeId: string;
    aggregateId: string;
    aggregateType: string;
    action: string;
    actorUserId: string;
    payloadJson: string;
  }> = [];

  async saveLog(log: {
    id: string;
    collegeId: string;
    aggregateId: string;
    aggregateType: string;
    action: string;
    actorUserId: string;
    payloadJson: string;
  }): Promise<void> {
    this.logs.push(log);
  }
}
