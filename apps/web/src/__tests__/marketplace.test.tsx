import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ListingCard, ListingGrid, ReservationBanner, SellerProfileCard } from '../components/marketplace/MarketplaceComponents';
import { fetchMarketplaceHome, getListingDetail } from '../lib/api-marketplace';

describe('Campus Marketplace Next.js 16 Component Suite', () => {
  const sampleListing = {
    id: 'list-001',
    collegeId: 'college-stanford-001',
    sellerUserId: 'seller-1',
    categoryCode: 'calculators',
    title: 'CASIO FX-991ES+ Scientific Calculator',
    slug: 'casio-fx-991es',
    conditionCode: 'LIKE_NEW' as const,
    listingType: 'SELL' as const,
    priceInr: 900,
    isNegotiable: true,
    pickupLocationName: 'Hostel Block 4 / Library Gate',
    status: 'PUBLISHED' as const,
    thumbnailUrl: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=400',
    createdAt: new Date().toISOString()
  };

  it('should render ListingCard with 4:3 fixed aspect ratio image, price in mono font, and badges', () => {
    render(<ListingCard listing={sampleListing} />);

    expect(screen.getByText('CASIO FX-991ES+ Scientific Calculator')).toBeDefined();
    expect(screen.getByText('₹900')).toBeDefined();
    expect(screen.getByText('NEGOTIABLE')).toBeDefined();
    expect(screen.getByText('LIKE_NEW')).toBeDefined();
    expect(screen.getByText('📍 Hostel Block 4 / Library Gate')).toBeDefined();
  });

  it('should render ListingGrid with multiple cards', () => {
    render(<ListingGrid listings={[sampleListing]} />);

    const cards = screen.getAllByTestId('marketplace-card');
    expect(cards.length).toBe(1);
  });

  it('should render 24-Hour ReservationBanner with amber styling', () => {
    render(<ReservationBanner expiresAt={new Date().toISOString()} />);

    const banner = screen.getByTestId('reservation-banner');
    expect(banner).toBeDefined();
    expect(screen.getByText('Item Reserved')).toBeDefined();
  });

  it('should render SellerProfileCard with student verification checkmark and badges', () => {
    render(
      <SellerProfileCard
        seller={{
          userId: 'seller-1',
          isVerifiedStudent: true,
          successfulSalesCount: 14,
          responseRatePercent: 98,
          badgeLevel: 'SENIOR_SELLER'
        }}
      />
    );

    expect(screen.getByTestId('seller-profile-card')).toBeDefined();
    expect(screen.getByText('SENIOR_SELLER')).toBeDefined();
    expect(screen.getByText('14')).toBeDefined();
    expect(screen.getByText('98%')).toBeDefined();
  });

  it('should fetch Marketplace Home feed payload correctly via API client', async () => {
    const data = await fetchMarketplaceHome('college-stanford-001');
    expect(data.featured.length).toBeGreaterThan(0);
    expect(data.categories.length).toBe(5);
  });

  it('should fetch Listing Detail composite read model payload correctly', async () => {
    const detail = await getListingDetail('list-001', 'college-stanford-001', 'user-buyer-1');
    expect(detail.listing.id).toBe('list-001');
    expect(detail.sellerProfile.isVerifiedStudent).toBe(true);
    expect(detail.statistics.totalViews).toBeGreaterThan(0);
  });
});
