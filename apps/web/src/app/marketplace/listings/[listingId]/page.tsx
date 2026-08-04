import React from 'react';
import Link from 'next/link';
import '@web/styles/marketplace.css';
import { getListingDetail } from '@web/lib/api-marketplace';
import { SellerProfileCard, ReservationBanner } from '@web/components/marketplace/MarketplaceComponents';

export default async function ListingDetailPage({ params }: { params: { listingId: string } }) {
  const detail = await getListingDetail(params.listingId);
  const { listing, mediaList, sellerProfile, reservationStatus } = detail;

  return (
    <div className="mp-container" style={{ maxWidth: '800px' }}>
      <Link href="/marketplace" style={{ color: 'var(--mp-color-emerald-dark)', fontWeight: 600, display: 'inline-block', marginBottom: '1rem' }}>
        ← Back to Marketplace
      </Link>

      {reservationStatus && <ReservationBanner expiresAt={reservationStatus.expiresAt} />}

      <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--mp-color-slate-200)', borderRadius: 'var(--mp-radius-lg)', overflow: 'hidden', marginBottom: '2rem' }}>
        <div style={{ width: '100%', height: '360px', backgroundColor: 'var(--mp-color-slate-100)', position: 'relative' }}>
          <img
            src={mediaList[0]?.mediaUrl || 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=800'}
            alt={listing.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: 700, color: 'var(--mp-color-slate-900)' }}>
              ₹{listing.priceInr.toLocaleString('en-IN')}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span className="mp-badge mp-badge-amber">{listing.isNegotiable ? 'NEGOTIABLE' : 'FIXED PRICE'}</span>
              <span className="mp-badge mp-badge-emerald">{listing.conditionCode}</span>
            </div>
          </div>

          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1rem 0' }}>{listing.title}</h1>

          <SellerProfileCard seller={sellerProfile} />

          <div style={{ borderTop: '1px solid var(--mp-color-slate-200)', paddingTop: '1rem', marginTop: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Item Description</h3>
            <p style={{ color: 'var(--mp-color-slate-700)', lineHeight: 1.5 }}>
              Mint condition scientific calculator. Mandatory for 1st-year engineering laboratory courses. Clean keypad with no scratches.
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--mp-color-slate-500)', marginTop: '0.75rem' }}>
              📍 Preferred Handover Spot: <strong>{listing.pickupLocationName}</strong>
            </p>
          </div>

          {/* Sticky CTA Action Bar */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button className="mp-btn mp-btn-primary" style={{ flex: 1 }}>
              Make Offer (₹)
            </button>
            <Link href="/marketplace/chat/conv-001" className="mp-btn mp-btn-outline" style={{ flex: 1 }}>
              💬 Chat with Seller
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
