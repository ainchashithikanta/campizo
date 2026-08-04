import React from 'react';
import '@web/styles/marketplace.css';
import { fetchMarketplaceHome } from '@web/lib/api-marketplace';
import { ListingGrid } from '@web/components/marketplace/MarketplaceComponents';

export default async function MyListingsPage() {
  const homeData = await fetchMarketplaceHome();

  return (
    <div className="mp-container">
      <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '1.5rem' }}>📦 My Posted Listings</h1>
      <ListingGrid listings={homeData.featured} />
    </div>
  );
}
