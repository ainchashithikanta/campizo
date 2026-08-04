import React from 'react';
import Link from 'next/link';
import '@web/styles/marketplace.css';

export default function MarketplaceConversationPage({ params }: { params: { conversationId: string } }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--mp-color-slate-50)' }}>
      {/* Sticky Item Header */}
      <div className="mp-chat-header">
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>CASIO FX-991ES+ Calculator</h3>
          <span style={{ fontSize: '0.875rem', color: 'var(--mp-color-slate-500)' }}>Price: ₹900 (Negotiable)</span>
        </div>
        <Link href="/marketplace/listings/list-001" className="mp-btn mp-btn-outline">
          View Item
        </Link>
      </div>

      {/* Chat Messages Container */}
      <div className="mp-container" style={{ flex: 1, maxWidth: '600px', width: '100%', padding: '1rem' }}>
        <div style={{ backgroundColor: 'var(--mp-color-amber-light)', padding: '0.75rem', borderRadius: 'var(--mp-radius-md)', fontSize: '0.875rem', color: '#78350f', marginBottom: '1rem' }}>
          🔒 Campus Safe Zone Reminder: Meet at public locations like Library Gate or Student Center.
        </div>

        {/* Immutable Offer Card */}
        <div className="mp-offer-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 700, color: 'var(--mp-color-emerald-dark)' }}>OFFER ACCEPTED</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--mp-color-slate-500)' }}>Today at 2:15 PM</span>
          </div>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, fontSize: '1.25rem' }}>Agreed Price: ₹800.00</p>
          <div className="mp-badge mp-badge-amber">⏳ 24-Hour Item Reservation Active</div>
        </div>

        {/* Message Bubble */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
          <div style={{ backgroundColor: 'var(--mp-color-emerald)', color: '#ffffff', padding: '0.75rem 1rem', borderRadius: '16px 16px 4px 16px', maxWidth: '80%' }}>
            Hi, can pick up from Library Gate today at 4 PM!
          </div>
        </div>
      </div>

      {/* Input Bar */}
      <div style={{ backgroundColor: '#ffffff', borderTop: '1px solid var(--mp-color-slate-200)', padding: '1rem' }}>
        <div className="mp-container" style={{ maxWidth: '600px', display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Type a message..."
            style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--mp-radius-full)', border: '1px solid var(--mp-color-slate-300)' }}
          />
          <button className="mp-btn mp-btn-primary">Send</button>
        </div>
      </div>
    </div>
  );
}
