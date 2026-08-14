/**
 * Typed API Client for Campus Marketplace Module
 */

export interface ListingSummary {
  id: string;
  collegeId: string;
  sellerUserId: string;
  categoryCode: string;
  title: string;
  slug: string;
  conditionCode: 'BRAND_NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR';
  listingType: 'SELL' | 'RENT' | 'GIVEAWAY';
  priceInr: number;
  isNegotiable: boolean;
  pickupLocationName: string;
  status: 'PUBLISHED' | 'RESERVED' | 'SOLD' | 'ARCHIVED' | 'QUARANTINED';
  thumbnailUrl?: string;
  createdAt: string;
}

export interface ListingDetailResponse {
  listing: ListingSummary;
  mediaList: Array<{ id: string; mediaUrl: string; isPrimary: boolean }>;
  sellerProfile: {
    userId: string;
    isVerifiedStudent: boolean;
    successfulSalesCount: number;
    responseRatePercent: number;
    badgeLevel: string;
  };
  statistics: {
    totalViews: number;
    totalBookmarks: number;
    totalOffers: number;
  };
  reservationStatus?: {
    id: string;
    expiresAt: string;
    status: string;
  } | null;
  userBookmarkState: boolean;
  currentUserActiveOffer?: {
    id: string;
    offeredPriceInr: number;
    status: string;
  } | null;
}

const DEFAULT_COLLEGE = 'college-nitk-003';
const DEFAULT_USER = 'user-student-101';

export async function fetchMarketplaceHome(collegeId: string = DEFAULT_COLLEGE) {
  return {
    featured: [
      {
        id: 'list-001',
        collegeId,
        sellerUserId: 'seller-1',
        categoryCode: 'calculators',
        title: 'CASIO FX-991ES+ Scientific Calculator',
        slug: 'casio-fx-991es-calculator',
        conditionCode: 'LIKE_NEW' as const,
        listingType: 'SELL' as const,
        priceInr: 900,
        isNegotiable: true,
        pickupLocationName: 'Hostel Block 4 / Library Gate',
        status: 'PUBLISHED' as const,
        thumbnailUrl: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=400',
        createdAt: new Date().toISOString()
      },
      {
        id: 'list-002',
        collegeId,
        sellerUserId: 'seller-2',
        categoryCode: 'textbooks',
        title: 'Engineering Mathematics Vol 1 (BS Grewal)',
        slug: 'engineering-math-bs-grewal',
        conditionCode: 'GOOD' as const,
        listingType: 'SELL' as const,
        priceInr: 450,
        isNegotiable: false,
        pickupLocationName: 'Main Department Gate',
        status: 'PUBLISHED' as const,
        thumbnailUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400',
        createdAt: new Date().toISOString()
      }
    ],
    categories: [
      { code: 'textbooks', name: '📚 Textbooks' },
      { code: 'calculators', name: '⚡ Calculators' },
      { code: 'cycles', name: '🚲 Bicycles' },
      { code: 'hostel', name: '🛏️ Hostel Gear' },
      { code: 'giveaways', name: '🎁 Free Giveaways' }
    ]
  };
}

export async function getListingDetail(
  listingId: string,
  collegeId: string = DEFAULT_COLLEGE,
  currentUserId: string = DEFAULT_USER
): Promise<ListingDetailResponse> {
  return {
    listing: {
      id: listingId,
      collegeId,
      sellerUserId: 'seller-1',
      categoryCode: 'calculators',
      title: 'CASIO FX-991ES+ Scientific Calculator',
      slug: 'casio-fx-991es',
      conditionCode: 'LIKE_NEW',
      listingType: 'SELL',
      priceInr: 900,
      isNegotiable: true,
      pickupLocationName: 'Hostel Block 4 / Library Gate',
      status: 'PUBLISHED',
      createdAt: new Date().toISOString()
    },
    mediaList: [
      { id: 'm1', mediaUrl: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=600', isPrimary: true }
    ],
    sellerProfile: {
      userId: 'seller-1',
      isVerifiedStudent: true,
      successfulSalesCount: 14,
      responseRatePercent: 98,
      badgeLevel: 'SENIOR_SELLER'
    },
    statistics: {
      totalViews: 142,
      totalBookmarks: 12,
      totalOffers: 3
    },
    reservationStatus: null,
    userBookmarkState: false,
    currentUserActiveOffer: null
  };
}
