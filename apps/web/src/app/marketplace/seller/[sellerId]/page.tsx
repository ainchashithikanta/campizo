import React from 'react';
import '@web/styles/marketplace.css';
import { fetchMarketplaceHome } from '@web/lib/api-marketplace';
import { SellerProfileCard, ListingGrid } from '@web/components/marketplace/MarketplaceComponents';

export default async function SellerProfilePage({ params }: { params: { sellerId: string } }) {
  const homeData = await fetchMarketplaceHome();

  return (
    <div className="mp-container" style={{ maxWidth: '900px' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '1.5rem' }}>👤 Seller Profile</h1>

      <SellerProfileCard
        seller={{
          userId: params.sellerId,
          isVerifiedStudent: true,
          successfulSalesCount: 14,
          responseRatePercent: 98,
          badgeLevel: 'SENIOR_SELLER'
        }}
      />

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Active Campus Listings</h2>
      <ListingGrid listings={homeData.featured} />
    </div>
  );
}
