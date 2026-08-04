import { z } from 'zod';

export const ListingCreateSchema = z.object({
  title: z.string().min(3).max(256),
  categoryCode: z.string().min(2).max(32),
  conditionCode: z.enum(['BRAND_NEW', 'LIKE_NEW', 'GOOD', 'FAIR']),
  listingType: z.enum(['SELL', 'RENT', 'GIVEAWAY']).default('SELL'),
  priceInr: z.number().min(0),
  isNegotiable: z.boolean().default(true),
  pickupLocationName: z.string().min(2).max(256),
  description: z.string().max(2000).optional(),
  mediaUrls: z.array(z.string().url()).max(6).optional()
});

export const ListingUpdateSchema = z.object({
  title: z.string().min(3).max(256).optional(),
  categoryCode: z.string().min(2).max(32).optional(),
  conditionCode: z.enum(['BRAND_NEW', 'LIKE_NEW', 'GOOD', 'FAIR']).optional(),
  priceInr: z.number().min(0).optional(),
  isNegotiable: z.boolean().optional(),
  pickupLocationName: z.string().min(2).max(256).optional(),
  description: z.string().max(2000).optional()
});

export const OfferCreateSchema = z.object({
  offeredPriceInr: z.number().min(0),
  message: z.string().max(500).optional()
});

export const CounterOfferSchema = z.object({
  counterPriceInr: z.number().min(0)
});

export const ConversationCreateSchema = z.object({
  listingId: z.string().min(1)
});

export const MessageCreateSchema = z.object({
  content: z.string().min(1).max(1000),
  messageType: z.enum(['TEXT', 'OFFER_CARD', 'SYSTEM_ALERT']).default('TEXT')
});

export const BookmarkSchema = z.object({});

export const ReportSchema = z.object({
  reasonCode: z.string().min(1).max(32),
  details: z.string().max(1000).optional()
});

export const UploadSessionSchema = z.object({
  fileName: z.string().min(1).max(256),
  fileSizeBytes: z.number().min(1).max(20971520), // 20 MB max
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  sha256Hash: z.string().length(64).optional()
});

export const SearchQuerySchema = z.object({
  query: z.string().optional(),
  categoryCode: z.string().optional(),
  conditionCode: z.enum(['BRAND_NEW', 'LIKE_NEW', 'GOOD', 'FAIR']).optional(),
  listingType: z.enum(['SELL', 'RENT', 'GIVEAWAY']).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
});

export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
});
