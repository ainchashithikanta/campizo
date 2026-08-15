'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import '@web/styles/admin.css';

interface MarketplaceListing {
  id: string;
  collegeId: string;
  sellerUserId: string;
  title: string;
  description?: string;
  category?: string;
  price?: number;
  status: string;
  createdAt?: string;
}

const ACTION_LABELS: Record<string, string> = {
  RESTORE: '🟢 Restore',
  HIDE: '🟡 Hide',
  DELETE: '🔴 Delete'
};

export default function AdminMarketplaceModerationPage() {
  const [cases, setCases] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    loadQueue();
  }, []);

  async function loadQueue() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/admin/api/moderation/marketplace', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setCases(data.data);
      } else {
        setError(data?.error?.message || 'Failed to load marketplace moderation queue.');
      }
    } catch {
      setError('Network error loading the queue.');
    } finally {
      setLoading(false);
    }
  }

  async function decide(listingId: string, action: string) {
    setActing(listingId);
    setNotice(null);
    try {
      const res = await fetch(`/admin/api/moderation/marketplace/${listingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reasonNote: 'Decided from Admin Moderation Center' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotice(`Decision ${action} recorded for listing ${listingId.slice(0, 8)}.`);
        await loadQueue();
      } else {
        setNotice(`Failed: ${data?.error?.message || 'Unknown error'}`);
      }
    } catch {
      setNotice('Network error recording decision.');
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="adx-page">
      <header className="adx-header">
        <div>
          <Link href="/admin/moderation" className="adx-back">
            ← Moderation Center
          </Link>
          <p className="adx-kicker">Blind Moderation · Seller identity 100% hidden</p>
          <h1 className="adx-title">🏷️ Marketplace Moderation</h1>
        </div>
        <button onClick={loadQueue} className="adx-logout" disabled={loading}>
          {loading ? 'Loading…' : '⟳ Refresh'}
        </button>
      </header>

      {notice && <p className="adx-note">{notice}</p>}
      {error && (
        <p className="adl-error" role="alert">
          ⛔ {error}
        </p>
      )}

      {loading ? (
        <div className="adx-note">Loading moderation queue…</div>
      ) : cases.length === 0 ? (
        <p className="adx-note">✅ No listings pending moderation.</p>
      ) : (
        <div className="adx-list">
          {cases.map((l) => (
            <div className="adx-card" key={l.id} style={{ padding: '1.25rem' }}>
              <div className="adx-card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0 }}>{l.title || `Listing #${l.id.slice(0, 8)}`}</h3>
                <span className="adx-card-kicker">
                  {l.category ? `${l.category} · ` : ''}
                  {l.price !== undefined ? `₹${l.price} · ` : ''}
                  {l.status}
                </span>
              </div>
              <p style={{ margin: '0.75rem 0', color: 'var(--adx-text-dim, #888)' }}>
                Listing: <code>{l.id}</code>
                {l.createdAt ? ` · ${new Date(l.createdAt).toLocaleString()}` : ''}
              </p>
              {l.description && (
                <blockquote
                  style={{
                    margin: '0.5rem 0',
                    padding: '0.75rem',
                    background: 'rgba(0,0,0,0.05)',
                    borderRadius: '8px',
                    borderLeft: '3px solid #888'
                  }}
                >
                  {l.description}
                </blockquote>
              )}
              <p style={{ margin: '0.25rem 0', fontSize: '0.85rem' }}>Seller: 🔒 {l.sellerUserId}</p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {Object.entries(ACTION_LABELS).map(([action, label]) => (
                  <button
                    key={action}
                    onClick={() => decide(l.id, action)}
                    disabled={acting === l.id}
                    className="adx-btn"
                  >
                    {acting === l.id ? 'Working…' : label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
