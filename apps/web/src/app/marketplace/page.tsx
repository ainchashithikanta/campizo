import React from 'react';
import Link from 'next/link';
import '@web/styles/marketplace.css';
import { fetchMarketplaceHome } from '@web/lib/api-marketplace';
import { ListingGrid } from '@web/components/marketplace/MarketplaceComponents';

export default async function MarketplaceHomePage() {
  const homeData = await fetchMarketplaceHome();

  return (
    <div className="mp-container">
      <div className="mp-hero-banner">
        <h1 className="mp-hero-title">Campus Marketplace 🛍️</h1>
        <p className="mp-hero-subtitle">
          Buy, sell, rent, and exchange textbooks, calculators, cycles, and hostel gear with verified campus peers.
        </p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/marketplace/upload" className="mp-btn mp-btn-primary">
            + Post a Listing
          </Link>
          <Link
            href="/marketplace/search"
            className="mp-btn mp-btn-outline"
            style={{ color: '#ffffff', borderColor: '#a7f3d0' }}
          >
            🔍 Search Items
          </Link>
        </div>
      </div>

      <div className="mp-category-carousel">
        {homeData.categories.map((cat) => (
          <Link href={`/marketplace/search?category=${cat.code}`} key={cat.code} className="mp-category-pill">
            {cat.name}
          </Link>
        ))}
      </div>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>🔥 Trending Campus Deals</h2>
        <ListingGrid listings={homeData.featured} />
      </section>
    </div>
  );
}
