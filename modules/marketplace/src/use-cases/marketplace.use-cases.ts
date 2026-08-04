import {
  MarketplaceListingRepository,
  OfferRepository,
  ReservationRepository,
  ConversationRepository,
  SellerProfileRepository,
  BookmarkRepository,
  ReportRepository,
  AuditRepository,
  MarketplaceListingEntity,
  OfferEntity,
  ReservationEntity,
  ConversationEntity,
  MessageEntity
} from '../domain/repository.interface.js';
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
} from '../domain/invariants.js';
import { MarketplaceEvents } from '../domain/events.js';
import { observability } from '@college-hub/observability';
import {
  DuplicateConversationError,
  DuplicateBookmarkError,
  DuplicateReportError,
  ListingUnavailableError,
  ReservationExpiredError,
  OfferAlreadyExistsError
} from '../errors/domain-errors.js';

export interface EventBus {
  publish(eventType: string, payload: unknown): Promise<void>;
}

export class MarketplaceUseCases {
  constructor(
    private listingRepo: MarketplaceListingRepository,
    private offerRepo: OfferRepository,
    private reservationRepo: ReservationRepository,
    private convRepo: ConversationRepository,
    private sellerRepo: SellerProfileRepository,
    private bookmarkRepo: BookmarkRepository,
    private reportRepo: ReportRepository,
    private auditRepo: AuditRepository,
    private eventBus: EventBus
  ) {}

  // 1. Create Listing Draft
  async createListingDraft(input: {
    collegeId: string;
    sellerUserId: string;
    categoryCode: string;
    title: string;
    conditionCode: string;
    listingType?: string | undefined;
    priceInr: number;
    isNegotiable?: boolean | undefined;
    pickupLocationName: string;
    description?: string | undefined;
    mediaUrls?: string[] | undefined;
  }): Promise<MarketplaceListingEntity> {
    assertValidPrice(input.priceInr);

    const listingId = `list-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const slug = `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${listingId.slice(-6)}`;

    const listing: MarketplaceListingEntity = {
      id: listingId,
      collegeId: input.collegeId,
      sellerUserId: input.sellerUserId,
      categoryCode: input.categoryCode,
      title: input.title,
      slug,
      description: input.description ?? null,
      conditionCode: input.conditionCode,
      listingType: input.listingType || 'SELL',
      priceInr: input.priceInr,
      isNegotiable: input.isNegotiable !== false,
      pickupLocationName: input.pickupLocationName,
      status: 'DRAFT',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const saved = await this.listingRepo.save(listing);

    if (input.mediaUrls && input.mediaUrls.length > 0) {
      let pos = 1;
      for (const url of input.mediaUrls) {
        assertValidMedia(url, pos);
        await this.listingRepo.saveMedia({
          id: `med-${listingId}-${pos}`,
          listingId,
          storageKey: `media/${listingId}/${pos}.webp`,
          mediaUrl: url,
          positionOrder: pos,
          isPrimary: pos === 1
        });
        pos++;
      }
    }

    await this.eventBus.publish(MarketplaceEvents.LISTING_CREATED, {
      listingId: saved.id,
      sellerUserId: saved.sellerUserId,
      title: saved.title,
      priceInr: saved.priceInr
    });

    observability.business.listingCreated();
    return saved;
  }

  // 2. Publish Listing
  async publishListing(listingId: string, collegeId: string, sellerUserId: string): Promise<MarketplaceListingEntity> {
    const listing = await this.listingRepo.findById(listingId, collegeId);
    if (!listing) throw new ListingUnavailableError(`Listing [${listingId}] not found.`);
    assertSameCollege(listing.collegeId, collegeId);
    if (listing.sellerUserId !== sellerUserId) throw new Error('Only the seller can publish this listing.');

    assertValidStateTransition(listing.status, 'PUBLISHED');
    listing.status = 'PUBLISHED';
    listing.updatedAt = new Date();

    const saved = await this.listingRepo.save(listing);

    await this.eventBus.publish(MarketplaceEvents.LISTING_PUBLISHED, {
      listingId: saved.id,
      sellerUserId: saved.sellerUserId,
      title: saved.title,
      priceInr: saved.priceInr
    });

    observability.business.listingPublished();
    return saved;
  }

  // 3. Submit Offer
  async submitOffer(input: {
    collegeId: string;
    listingId: string;
    buyerUserId: string;
    offeredPriceInr: number;
    message?: string | undefined;
  }): Promise<OfferEntity> {
    const listing = await this.listingRepo.findById(input.listingId, input.collegeId);
    if (!listing) throw new ListingUnavailableError('Listing not found.');

    assertSameCollege(listing.collegeId, input.collegeId);
    assertListingPublished(listing.status);
    assertNotSelfPurchase(listing.sellerUserId, input.buyerUserId);
    assertValidPrice(input.offeredPriceInr);

    const existing = await this.offerRepo.findActiveByBuyerAndListing(
      input.buyerUserId,
      input.listingId,
      input.collegeId
    );
    if (existing) throw new OfferAlreadyExistsError('An active pending offer already exists for this item.');

    const offerId = `off-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const offer: OfferEntity = {
      id: offerId,
      collegeId: input.collegeId,
      listingId: input.listingId,
      buyerUserId: input.buyerUserId,
      sellerUserId: listing.sellerUserId,
      offeredPriceInr: input.offeredPriceInr,
      status: 'CREATED',
      expiresAt,
      createdAt: new Date()
    };

    const saved = await this.offerRepo.save(offer);

    await this.eventBus.publish(MarketplaceEvents.OFFER_CREATED, {
      offerId: saved.id,
      listingId: saved.listingId,
      buyerUserId: saved.buyerUserId,
      sellerUserId: saved.sellerUserId,
      offeredPriceInr: saved.offeredPriceInr
    });

    observability.business.offerCreated();
    return saved;
  }

  // 4. Accept Offer & Create Reservation
  async acceptOffer(
    offerId: string,
    collegeId: string,
    sellerUserId: string
  ): Promise<{ offer: OfferEntity; reservation: ReservationEntity }> {
    const offer = await this.offerRepo.findById(offerId, collegeId);
    if (!offer) throw new Error('Offer not found.');

    assertSameCollege(offer.collegeId, collegeId);
    if (offer.sellerUserId !== sellerUserId) throw new Error('Only the seller can accept this offer.');

    const listing = await this.listingRepo.findById(offer.listingId, collegeId);
    if (!listing) throw new ListingUnavailableError('Listing not found.');
    assertListingPublished(listing.status);
    assertSingleActiveReservation(listing.currentReservationId);

    // Update Offer Status
    offer.status = 'ACCEPTED';
    const savedOffer = await this.offerRepo.save(offer);

    // Create Reservation
    assertReservationFromAcceptedOffer(savedOffer.status);
    const resId = `res-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const resExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const reservation: ReservationEntity = {
      id: resId,
      collegeId,
      listingId: listing.id,
      offerId: savedOffer.id,
      buyerUserId: savedOffer.buyerUserId,
      sellerUserId: savedOffer.sellerUserId,
      startsAt: new Date(),
      expiresAt: resExpiresAt,
      status: 'ACTIVE'
    };

    const savedReservation = await this.reservationRepo.save(reservation);

    // Lock Listing Status
    assertValidStateTransition(listing.status, 'RESERVED');
    listing.status = 'RESERVED';
    listing.currentReservationId = savedReservation.id;
    listing.updatedAt = new Date();
    await this.listingRepo.save(listing);

    // Audit Log
    await this.auditRepo.saveLog({
      id: `audit-${Date.now()}`,
      collegeId,
      aggregateId: listing.id,
      aggregateType: 'MarketplaceListing',
      action: 'OFFER_ACCEPTED_RESERVED',
      actorUserId: sellerUserId,
      payloadJson: JSON.stringify({ offerId, reservationId: savedReservation.id })
    });

    // Publish Events
    await this.eventBus.publish(MarketplaceEvents.OFFER_ACCEPTED, {
      offerId: savedOffer.id,
      listingId: listing.id,
      buyerUserId: savedOffer.buyerUserId,
      sellerUserId: savedOffer.sellerUserId,
      agreedPriceInr: savedOffer.offeredPriceInr
    });

    await this.eventBus.publish(MarketplaceEvents.RESERVATION_CREATED, {
      reservationId: savedReservation.id,
      listingId: listing.id,
      offerId: savedOffer.id,
      buyerUserId: savedOffer.buyerUserId,
      sellerUserId: savedOffer.sellerUserId,
      expiresAt: savedReservation.expiresAt.toISOString()
    });

    observability.business.offerAccepted();
    return { offer: savedOffer, reservation: savedReservation };
  }

  // 5. Create Conversation
  async createConversation(input: {
    collegeId: string;
    listingId: string;
    buyerUserId: string;
  }): Promise<ConversationEntity> {
    const listing = await this.listingRepo.findById(input.listingId, input.collegeId);
    if (!listing) throw new ListingUnavailableError('Listing not found.');

    assertSameCollege(listing.collegeId, input.collegeId);
    assertNotSelfPurchase(listing.sellerUserId, input.buyerUserId);

    const existing = await this.convRepo.findByBuyerAndListing(input.buyerUserId, input.listingId, input.collegeId);
    if (existing)
      throw new DuplicateConversationError(
        'A conversation already exists between this buyer and seller for this item.'
      );

    const convId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const conversation: ConversationEntity = {
      id: convId,
      collegeId: input.collegeId,
      listingId: input.listingId,
      buyerUserId: input.buyerUserId,
      sellerUserId: listing.sellerUserId,
      lastMessageAt: new Date()
    };

    const saved = await this.convRepo.saveConversation(conversation);

    await this.eventBus.publish(MarketplaceEvents.CONVERSATION_CREATED, {
      conversationId: saved.id,
      listingId: saved.listingId,
      buyerUserId: saved.buyerUserId,
      sellerUserId: saved.sellerUserId
    });

    return saved;
  }

  // 6. Send Message
  async sendMessage(input: {
    collegeId: string;
    conversationId: string;
    senderUserId: string;
    content: string;
    messageType?: string | undefined;
  }): Promise<MessageEntity> {
    const conv = await this.convRepo.findById(input.conversationId, input.collegeId);
    if (!conv) throw new Error('Conversation not found.');

    assertSameCollege(conv.collegeId, input.collegeId);
    if (input.senderUserId !== conv.buyerUserId && input.senderUserId !== conv.sellerUserId) {
      throw new Error('Sender is not a participant in this conversation.');
    }

    const msgId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const message: MessageEntity = {
      id: msgId,
      conversationId: input.conversationId,
      senderUserId: input.senderUserId,
      messageType: input.messageType || 'TEXT',
      content: input.content,
      isRead: false,
      createdAt: new Date()
    };

    const saved = await this.convRepo.saveMessage(message);

    conv.lastMessageAt = new Date();
    await this.convRepo.saveConversation(conv);

    await this.eventBus.publish(MarketplaceEvents.MESSAGE_SENT, {
      messageId: saved.id,
      conversationId: saved.conversationId,
      senderUserId: saved.senderUserId,
      messageType: saved.messageType
    });

    return saved;
  }

  // 7. Bookmark Listing
  async bookmarkListing(collegeId: string, userId: string, listingId: string): Promise<void> {
    const existing = await this.bookmarkRepo.findByUserAndListing(userId, listingId, collegeId);
    if (existing) throw new DuplicateBookmarkError('Listing is already bookmarked.');

    await this.bookmarkRepo.save({
      id: `bmk-${Date.now()}`,
      collegeId,
      userId,
      listingId,
      createdAt: new Date()
    });

    await this.eventBus.publish(MarketplaceEvents.BOOKMARK_ADDED, { collegeId, userId, listingId });
  }

  // 8. Report Listing with Automated Quarantine Circuit Breaker (3 Reports)
  async reportListing(
    collegeId: string,
    reporterUserId: string,
    listingId: string,
    reasonCode: string,
    details?: string | undefined
  ): Promise<void> {
    const listing = await this.listingRepo.findById(listingId, collegeId);
    if (!listing) throw new ListingUnavailableError('Listing not found.');

    assertSameCollege(listing.collegeId, collegeId);
    const existing = await this.reportRepo.findByReporterAndListing(reporterUserId, listingId, collegeId);
    if (existing) throw new DuplicateReportError('You have already submitted a report for this listing.');

    await this.reportRepo.save({
      id: `rep-${Date.now()}`,
      collegeId,
      reporterUserId,
      listingId,
      reasonCode,
      details: details ?? null,
      createdAt: new Date()
    });

    const reportCount = await this.reportRepo.countByListing(listingId, collegeId);

    // Automated 3-Report Quarantine Circuit Breaker
    if (reportCount >= 3 && listing.status === 'PUBLISHED') {
      assertValidStateTransition(listing.status, 'QUARANTINED');
      listing.status = 'QUARANTINED';
      listing.updatedAt = new Date();
      await this.listingRepo.save(listing);
    }

    await this.eventBus.publish(MarketplaceEvents.LISTING_REPORTED, {
      reportId: `rep-${Date.now()}`,
      listingId,
      reporterUserId,
      reasonCode,
      totalReportCount: reportCount
    });
  }

  // 9. Complete Reservation & Mark Sold
  async completeReservation(
    reservationId: string,
    collegeId: string,
    sellerUserId: string
  ): Promise<MarketplaceListingEntity> {
    try {
      const res = await this.reservationRepo.findById(reservationId, collegeId);
      if (!res) throw new ReservationExpiredError('Reservation not found.');

      assertSameCollege(res.collegeId, collegeId);
      if (res.sellerUserId !== sellerUserId) throw new Error('Only the seller can complete the transaction.');

      res.status = 'COMPLETED';
      await this.reservationRepo.save(res);

      const listing = await this.listingRepo.findById(res.listingId, collegeId);
      if (!listing) throw new ListingUnavailableError('Listing not found.');

      assertValidStateTransition(listing.status, 'SOLD');
      listing.status = 'SOLD';
      listing.updatedAt = new Date();
      const savedListing = await this.listingRepo.save(listing);

      await this.eventBus.publish(MarketplaceEvents.LISTING_SOLD, {
        listingId: savedListing.id,
        sellerUserId: savedListing.sellerUserId,
        buyerUserId: res.buyerUserId
      });

      observability.business.listingSold();
      observability.business.purchaseSuccess();
      return savedListing;
    } catch (err) {
      observability.business.purchaseFailed();
      throw err;
    }
  }
}
