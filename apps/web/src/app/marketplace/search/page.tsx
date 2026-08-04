import React from 'react';
import '@web/styles/marketplace.css';
import { fetchMarketplaceHome } from '@web/lib/api-marketplace';
import { ListingGrid } from '@web/components/marketplace/MarketplaceComponents';

export default async function MarketplaceSearchPage() {
  const homeData = await fetchMarketplaceHome();

  return (
    <div className="mp-container">
      <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '1.5rem' }}>🔍 Search Campus Marketplace</h1>

      <div style={{ marginBottom: '2rem' }}>
        <input
          type="text"
          placeholder="Search textbooks, CASIO calculators, bicycles, mattresses..."
          style={{
            width: '100%',
            padding: '0.875rem 1.25rem',
            fontSize: '1rem',
            borderRadius: 'var(--mp-radius-md)',
            border: '1px solid var(--mp-color-slate-300)',
            marginBottom: '1rem'
          }}
        />

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span className="mp-category-pill active">All Categories</span>
          <span className="mp-category-pill">Calculators</span>
          <span className="mp-category-pill">Textbooks</span>
          <span className="mp-category-pill">Bicycles</span>
          <span className="mp-category-pill">Under ₹1,000</span>
        </div>
      </div>

      <ListingGrid listings={homeData.featured} />
    </div>
  );
}
