import React from 'react';
import Link from 'next/link';
import { ListingSummary } from '../../lib/api-marketplace';

export function ListingCard({ listing }: { listing: ListingSummary }) {
  return (
    <div className="mp-card" data-testid="marketplace-card">
      <div className="mp-card-image-wrapper">
        <img
          src={listing.thumbnailUrl || 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=400'}
          alt={listing.title}
          className="mp-card-image"
        />
        <div style={{ position: 'absolute', top: '8px', left: '8px' }}>
          <span className="mp-badge mp-badge-emerald">{listing.listingType}</span>
        </div>
      </div>

      <div className="mp-card-body">
        <div className="mp-card-price-row">
          <span className="mp-card-price">₹{listing.priceInr.toLocaleString('en-IN')}</span>
          {listing.isNegotiable && <span className="mp-badge mp-badge-amber">NEGOTIABLE</span>}
        </div>

        <h3 className="mp-card-title">{listing.title}</h3>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span className="mp-badge mp-badge-slate">{listing.conditionCode}</span>
          <span className={`mp-badge ${listing.status === 'RESERVED' ? 'mp-badge-amber' : 'mp-badge-emerald'}`}>
            {listing.status}
          </span>
        </div>

        <p className="mp-card-location">📍 {listing.pickupLocationName}</p>

        <Link
          href={`/marketplace/listings/${listing.id}`}
          className="mp-btn mp-btn-outline"
          style={{ width: '100%', marginTop: '0.75rem' }}
        >
          View Details
        </Link>
      </div>
    </div>
  );
}

export function ListingGrid({ listings }: { listings: ListingSummary[] }) {
  return (
    <div className="mp-grid">
      {listings.map(item => (
        <ListingCard key={item.id} listing={item} />
      ))}
    </div>
  );
}

export function ReservationBanner({ expiresAt }: { expiresAt: string }) {
  return (
    <div className="mp-reservation-banner" data-testid="reservation-banner">
      <span>⏳</span>
      <div>
        <strong>Item Reserved</strong>
        <p style={{ margin: 0, fontSize: '0.875rem' }}>
          This item is locked for 24 hours while buyer and seller confirm physical meetup details.
        </p>
      </div>
    </div>
  );
}

export function SellerProfileCard({
  seller
}: {
  seller: {
    userId: string;
    isVerifiedStudent: boolean;
    successfulSalesCount: number;
    responseRatePercent: number;
    badgeLevel: string;
  };
}) {
  return (
    <div
      style={{
        padding: '1.25rem',
        backgroundColor: '#ffffff',
        border: '1px solid var(--mp-color-slate-200)',
        borderRadius: 'var(--mp-radius-md)',
        marginBottom: '1.5rem'
      }}
      data-testid="seller-profile-card"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'var(--mp-color-emerald-light)',
            color: 'var(--mp-color-emerald-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700
          }}
        >
          {seller.userId.slice(-2).toUpperCase()}
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
            Verified Student {seller.isVerifiedStudent && '✅'}
          </h4>
          <span className="mp-badge mp-badge-emerald">{seller.badgeLevel}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: 'var(--mp-color-slate-500)' }}>
        <div>
          <strong>{seller.successfulSalesCount}</strong> Successful Sales
        </div>
        <div>
          <strong>{seller.responseRatePercent}%</strong> Response Rate
        </div>
      </div>
    </div>
  );
}
