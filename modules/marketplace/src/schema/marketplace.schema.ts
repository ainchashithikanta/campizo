import {
  pgTable,
  varchar,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  index,
  uniqueIndex,
  primaryKey
} from 'drizzle-orm/pg-core';

// 1. Global Shared Reference Tables
export const marketplaceCategories = pgTable('marketplace_categories', {
  code: varchar('code', { length: 32 }).primaryKey(),
  displayName: varchar('display_name', { length: 128 }).notNull(),
  description: text('description'),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const marketplaceConditions = pgTable('marketplace_conditions', {
  code: varchar('code', { length: 32 }).primaryKey(),
  displayName: varchar('display_name', { length: 128 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const marketplaceListingStatuses = pgTable('marketplace_listing_statuses', {
  code: varchar('code', { length: 32 }).primaryKey(),
  displayName: varchar('display_name', { length: 128 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const trustBadges = pgTable('trust_badges', {
  code: varchar('code', { length: 32 }).primaryKey(),
  displayName: varchar('display_name', { length: 128 }).notNull(),
  minSalesRequired: integer('min_sales_required').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const reportReasons = pgTable('report_reasons', {
  code: varchar('code', { length: 32 }).primaryKey(),
  displayName: varchar('display_name', { length: 128 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// 2. Marketplace Listings Aggregate Root
export const marketplaceListings = pgTable(
  'marketplace_listings',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    sellerUserId: varchar('seller_user_id', { length: 64 }).notNull(),
    categoryCode: varchar('category_code', { length: 32 })
      .notNull()
      .references(() => marketplaceCategories.code),
    title: varchar('title', { length: 256 }).notNull(),
    slug: varchar('slug', { length: 300 }).notNull(),
    description: text('description'),
    conditionCode: varchar('condition_code', { length: 32 })
      .notNull()
      .references(() => marketplaceConditions.code),
    listingType: varchar('listing_type', { length: 32 }).notNull().default('SELL'), // SELL, RENT, GIVEAWAY
    priceInr: numeric('price_inr', { precision: 10, scale: 2 }).notNull().default('0.00'),
    isNegotiable: boolean('is_negotiable').notNull().default(true),
    pickupLocationName: varchar('pickup_location_name', { length: 256 }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('PUBLISHED'), // DRAFT, PUBLISHED, RESERVED, SOLD, ARCHIVED, QUARANTINED, DELETED
    currentReservationId: varchar('current_reservation_id', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true })
  },
  (table) => ({
    collegeCategoryIdx: index('idx_mp_listings_college_cat').on(table.collegeId, table.status, table.categoryCode),
    collegeSellerIdx: index('idx_mp_listings_college_seller').on(table.collegeId, table.sellerUserId),
    collegeSlugIdx: uniqueIndex('idx_mp_listings_college_slug').on(table.collegeId, table.slug)
  })
);

export const listingMedia = pgTable(
  'listing_media',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    listingId: varchar('listing_id', { length: 64 })
      .notNull()
      .references(() => marketplaceListings.id),
    storageKey: varchar('storage_key', { length: 512 }).notNull(),
    mediaUrl: text('media_url').notNull(),
    positionOrder: integer('position_order').notNull().default(1),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    listingMediaIdx: index('idx_listing_media_listing_id').on(table.listingId, table.positionOrder)
  })
);

export const listingTags = pgTable(
  'listing_tags',
  {
    listingId: varchar('listing_id', { length: 64 })
      .notNull()
      .references(() => marketplaceListings.id),
    tag: varchar('tag', { length: 64 }).notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.listingId, table.tag] })
  })
);

// 3. Offers & Negotiation History
export const marketplaceOffers = pgTable(
  'marketplace_offers',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    listingId: varchar('listing_id', { length: 64 })
      .notNull()
      .references(() => marketplaceListings.id),
    buyerUserId: varchar('buyer_user_id', { length: 64 }).notNull(),
    sellerUserId: varchar('seller_user_id', { length: 64 }).notNull(),
    offeredPriceInr: numeric('offered_price_inr', { precision: 10, scale: 2 }).notNull(),
    counterPriceInr: numeric('counter_price_inr', { precision: 10, scale: 2 }),
    status: varchar('status', { length: 32 }).notNull().default('CREATED'), // CREATED, COUNTERED, ACCEPTED, REJECTED, WITHDRAWN, EXPIRED
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    listingOffersIdx: index('idx_mp_offers_listing_buyer').on(table.collegeId, table.listingId, table.buyerUserId)
  })
);

export const offerHistory = pgTable('offer_history', {
  id: varchar('id', { length: 64 }).primaryKey(),
  offerId: varchar('offer_id', { length: 64 })
    .notNull()
    .references(() => marketplaceOffers.id),
  actionByUserId: varchar('action_by_user_id', { length: 64 }).notNull(),
  actionType: varchar('action_type', { length: 32 }).notNull(), // CREATED, COUNTERED, ACCEPTED, REJECTED
  priceInr: numeric('price_inr', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// 4. Reservations Aggregate Root
export const marketplaceReservations = pgTable(
  'marketplace_reservations',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    listingId: varchar('listing_id', { length: 64 })
      .notNull()
      .references(() => marketplaceListings.id),
    offerId: varchar('offer_id', { length: 64 })
      .notNull()
      .references(() => marketplaceOffers.id),
    buyerUserId: varchar('buyer_user_id', { length: 64 }).notNull(),
    sellerUserId: varchar('seller_user_id', { length: 64 }).notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('ACTIVE'), // ACTIVE, COMPLETED, EXPIRED, CANCELLED
    cancelReason: text('cancel_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    listingReservationIdx: index('idx_mp_reservations_listing').on(table.collegeId, table.listingId, table.status)
  })
);

// 5. In-App Chat & Messages
export const marketplaceConversations = pgTable(
  'marketplace_conversations',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    listingId: varchar('listing_id', { length: 64 })
      .notNull()
      .references(() => marketplaceListings.id),
    buyerUserId: varchar('buyer_user_id', { length: 64 }).notNull(),
    sellerUserId: varchar('seller_user_id', { length: 64 }).notNull(),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    uniqueConversationIdx: uniqueIndex('idx_mp_conv_listing_buyer').on(
      table.collegeId,
      table.listingId,
      table.buyerUserId
    )
  })
);

export const conversationParticipants = pgTable(
  'conversation_participants',
  {
    conversationId: varchar('conversation_id', { length: 64 })
      .notNull()
      .references(() => marketplaceConversations.id),
    userId: varchar('user_id', { length: 64 }).notNull(),
    role: varchar('role', { length: 32 }).notNull(), // BUYER, SELLER
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.conversationId, table.userId] })
  })
);

export const conversationMessages = pgTable(
  'conversation_messages',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    conversationId: varchar('conversation_id', { length: 64 })
      .notNull()
      .references(() => marketplaceConversations.id),
    senderUserId: varchar('sender_user_id', { length: 64 }).notNull(),
    messageType: varchar('message_type', { length: 32 }).notNull().default('TEXT'), // TEXT, OFFER_CARD, SYSTEM_ALERT
    content: text('content').notNull(),
    offerId: varchar('offer_id', { length: 64 }),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    messagesIdx: index('idx_conv_messages_conv_id').on(table.conversationId, table.createdAt)
  })
);

// 6. Seller Profiles Aggregate Root
export const sellerProfiles = pgTable(
  'seller_profiles',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    userId: varchar('user_id', { length: 64 }).notNull(),
    isVerifiedStudent: boolean('is_verified_student').notNull().default(true),
    totalListingsPosted: integer('total_listings_posted').notNull().default(0),
    successfulSalesCount: integer('successful_sales_count').notNull().default(0),
    cancelledReservationsCount: integer('cancelled_reservations_count').notNull().default(0),
    responseRatePercent: numeric('response_rate_percent', { precision: 5, scale: 2 }).notNull().default('100.00'),
    badgeLevel: varchar('badge_level', { length: 32 }).notNull().default('VERIFIED_STUDENT'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    uniqueSellerIdx: uniqueIndex('idx_seller_profiles_user').on(table.collegeId, table.userId)
  })
);

// 7. Engagement & Moderation
export const marketplaceBookmarks = pgTable(
  'marketplace_bookmarks',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    userId: varchar('user_id', { length: 64 }).notNull(),
    listingId: varchar('listing_id', { length: 64 })
      .notNull()
      .references(() => marketplaceListings.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    uniqueBookmarkIdx: uniqueIndex('idx_mp_bookmarks_user_listing').on(table.collegeId, table.userId, table.listingId)
  })
);

export const marketplaceViews = pgTable('marketplace_views', {
  id: varchar('id', { length: 64 }).primaryKey(),
  collegeId: varchar('college_id', { length: 64 }).notNull(),
  listingId: varchar('listing_id', { length: 64 })
    .notNull()
    .references(() => marketplaceListings.id),
  viewerUserId: varchar('viewer_user_id', { length: 64 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const marketplaceReports = pgTable(
  'marketplace_reports',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    reporterUserId: varchar('reporter_user_id', { length: 64 }).notNull(),
    listingId: varchar('listing_id', { length: 64 })
      .notNull()
      .references(() => marketplaceListings.id),
    reasonCode: varchar('reason_code', { length: 32 })
      .notNull()
      .references(() => reportReasons.code),
    details: text('details'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    uniqueReportIdx: uniqueIndex('idx_mp_reports_user_listing').on(
      table.collegeId,
      table.reporterUserId,
      table.listingId
    )
  })
);

export const marketplaceStatistics = pgTable('marketplace_statistics', {
  listingId: varchar('listing_id', { length: 64 })
    .primaryKey()
    .references(() => marketplaceListings.id),
  collegeId: varchar('college_id', { length: 64 }).notNull(),
  totalViews: integer('total_views').notNull().default(0),
  totalBookmarks: integer('total_bookmarks').notNull().default(0),
  totalOffers: integer('total_offers').notNull().default(0),
  popularityScore: numeric('popularity_score', { precision: 8, scale: 2 }).notNull().default('0.00'),
  lastCalculatedAt: timestamp('last_calculated_at', { withTimezone: true }).notNull().defaultNow()
});

export const marketplaceAuditLogs = pgTable('marketplace_audit_logs', {
  id: varchar('id', { length: 64 }).primaryKey(),
  collegeId: varchar('college_id', { length: 64 }).notNull(),
  aggregateId: varchar('aggregate_id', { length: 64 }).notNull(),
  aggregateType: varchar('aggregate_type', { length: 64 }).notNull(),
  action: varchar('action', { length: 64 }).notNull(),
  actorUserId: varchar('actor_user_id', { length: 64 }).notNull(),
  payloadJson: text('payload_json').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});
