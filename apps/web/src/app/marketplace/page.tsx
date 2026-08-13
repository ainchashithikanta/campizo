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
        <div className="mp-hero-glow" />
        <div className="mp-hero-copy">
          <p className="mp-hero-kicker">For students, by students</p>
          <h1 className="mp-hero-title">Campus Marketplace 🛍️</h1>
          <p className="mp-hero-subtitle">
            Buy, sell, rent, and exchange textbooks, calculators, cycles, and hostel gear with verified campus peers.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href="/marketplace/upload" className="mp-btn mp-btn-primary">
              + Post a Listing
            </Link>
            <Link href="/marketplace/search" className="mp-btn mp-btn-ghost">
              🔍 Search Items
            </Link>
          </div>
        </div>
        <div className="mp-hero-stats">
          <div className="mp-hero-stat">
            <span className="mp-hero-stat-value">320</span>
            <span className="mp-hero-stat-label">live listings</span>
          </div>
          <div className="mp-hero-stat">
            <span className="mp-hero-stat-value">1.2k+</span>
            <span className="mp-hero-stat-label">deals completed</span>
          </div>
          <div className="mp-hero-stat">
            <span className="mp-hero-stat-value">100%</span>
            <span className="mp-hero-stat-label">verified students</span>
          </div>
        </div>
      </div>

      <div className="mp-category-carousel">
        {homeData.categories.map((cat) => (
          <Link href={`/marketplace/search?category=${cat.code}`} key={cat.code} className="mp-category-pill">
            {cat.name}
          </Link>
        ))}
      </div>

      <section className="mp-section">
        <div className="mp-section-head">
          <h2>🔥 Trending Campus Deals</h2>
          <Link href="/marketplace/search" className="mp-see-all">
            See all →
          </Link>
        </div>
        <ListingGrid listings={homeData.featured} />
      </section>
    </div>
  );
}
