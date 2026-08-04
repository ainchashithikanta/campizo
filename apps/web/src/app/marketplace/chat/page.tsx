import React from 'react';
import Link from 'next/link';
import '../../../styles/marketplace.css';

export default function MarketplaceChatListPage() {
  return (
    <div className="mp-container" style={{ maxWidth: '600px' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '1.5rem' }}>💬 Marketplace Chats</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <Link
          href="/marketplace/chat/conv-001"
          style={{
            padding: '1rem',
            backgroundColor: '#ffffff',
            border: '1px solid var(--mp-color-slate-200)',
            borderRadius: 'var(--mp-radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            textDecoration: 'none',
            color: 'inherit'
          }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--mp-color-emerald-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
            S1
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0, fontWeight: 600 }}>CASIO FX-991ES+ Calculator</h4>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--mp-color-slate-500)' }}>
              Offer Accepted: ₹800 • Reserved for 24h
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
