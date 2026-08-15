import {
  MarketplaceListingRepository,
  SellerProfileRepository,
  MarketplaceStatisticsRepository,
  ConversationRepository,
  ReservationRepository,
  BookmarkRepository,
  OfferRepository,
  MarketplaceListingEntity
} from '../domain/repository.interface.js';

export interface SearchListingsFilter {
  query?: string | undefined;
  categoryCode?: string | undefined;
  conditionCode?: string | undefined;
  listingType?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export class MarketplaceQueries {
  constructor(
    private listingRepo: MarketplaceListingRepository,
    private sellerRepo: SellerProfileRepository,
    private statsRepo: MarketplaceStatisticsRepository,
    private convRepo: ConversationRepository,
    private reservationRepo: ReservationRepository,
    private bookmarkRepo: BookmarkRepository,
    private offerRepo?: OfferRepository
  ) {}

  async searchListings(collegeId: string, filter: SearchListingsFilter) {
    const all = await this.listingRepo.findByCategory(filter.categoryCode || 'calculators', collegeId);
    let results = all.filter((item) => item.status === 'PUBLISHED');

    if (filter.query) {
      const q = filter.query.toLowerCase();
      results = results.filter(
        (i) => i.title.toLowerCase().includes(q) || (i.description && i.description.toLowerCase().includes(q))
      );
    }
    if (filter.conditionCode) {
      results = results.filter((i) => i.conditionCode === filter.conditionCode);
    }
    if (filter.minPrice !== undefined) {
      results = results.filter((i) => i.priceInr >= (filter.minPrice || 0));
    }
    if (filter.maxPrice !== undefined) {
      results = results.filter((i) => i.priceInr <= (filter.maxPrice || Infinity));
    }

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const totalItems = results.length;
    const paginated = results.slice((page - 1) * limit, page * limit);

    return {
      items: paginated,
      meta: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) || 1 }
    };
  }

  async getModerationQueue(collegeId: string): Promise<MarketplaceListingEntity[]> {
    return this.listingRepo.listModerationQueue(collegeId);
  }

  async getListingDetail(id: string, collegeId: string, currentUserId?: string) {
    const listing = await this.listingRepo.findById(id, collegeId);
    if (!listing) return null;

    const mediaList = await this.listingRepo.findMediaByListing(id);
    const sellerProfile = await this.sellerRepo.findByUser(listing.sellerUserId, collegeId);
    const statistics = await this.statsRepo.findByListing(id, collegeId);

    let reservationStatus = null;
    if (listing.currentReservationId) {
      reservationStatus = await this.reservationRepo.findById(listing.currentReservationId, collegeId);
    }

    let userBookmarkState = false;
    let currentUserActiveOffer = null;

    if (currentUserId) {
      const bmk = await this.bookmarkRepo.findByUserAndListing(currentUserId, id, collegeId);
      userBookmarkState = !!bmk;

      if (this.offerRepo) {
        currentUserActiveOffer = await this.offerRepo.findActiveByBuyerAndListing(currentUserId, id, collegeId);
      }
    }

    return {
      listing,
      mediaList,
      sellerProfile: sellerProfile || {
        userId: listing.sellerUserId,
        collegeId,
        isVerifiedStudent: true,
        totalListingsPosted: 1,
        successfulSalesCount: 0,
        responseRatePercent: 100,
        badgeLevel: 'VERIFIED_STUDENT'
      },
      statistics: statistics || {
        listingId: id,
        collegeId,
        totalViews: 1,
        totalBookmarks: 0,
        totalOffers: 0,
        popularityScore: 0
      },
      reservationStatus,
      userBookmarkState,
      currentUserActiveOffer
    };
  }

  async getMarketplaceHome(collegeId: string) {
    const calculators = await this.listingRepo.findByCategory('calculators', collegeId);
    const published = calculators.filter((i) => i.status === 'PUBLISHED');

    return {
      featured: published.slice(0, 4),
      recent: published.slice(0, 8),
      trending: published.slice(0, 4)
    };
  }

  async getSellerProfile(userId: string, collegeId: string) {
    const profile = await this.sellerRepo.findByUser(userId, collegeId);
    return (
      profile || {
        userId,
        collegeId,
        isVerifiedStudent: true,
        totalListingsPosted: 0,
        successfulSalesCount: 0,
        cancelledReservationsCount: 0,
        responseRatePercent: 100,
        badgeLevel: 'VERIFIED_STUDENT'
      }
    );
  }

  async getReservationStatus(reservationId: string, collegeId: string) {
    return this.reservationRepo.findById(reservationId, collegeId);
  }

  async getConversationMessages(conversationId: string, collegeId: string) {
    const conv = await this.convRepo.findById(conversationId, collegeId);
    if (!conv) return null;
    const messages = await this.convRepo.findMessagesByConversation(conversationId);
    return { conversation: conv, messages };
  }
}
