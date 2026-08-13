'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import '@web/styles/admin.css';

interface ReviewCase {
  id: string;
  collegeId: string;
  professorId: string;
  courseAssignmentId: string;
  authorUserId: string;
  authorAnonymousToken: string;
  isAnonymous: boolean;
  reviewText: string;
  overallRating: number;
  moderationStatus: string;
  helpfulCount: number;
  unhelpfulCount: number;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  APPROVE: '🟢 Approve',
  HIDE: '🟡 Hide',
  REJECT: '🔴 Reject',
  RESTORE: '🔵 Restore'
};

export default function AdminProfessorModerationPage() {
  const [cases, setCases] = useState<ReviewCase[]>([]);
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
      const res = await fetch('/admin/api/moderation/professors', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setCases(data.data);
      } else {
        setError(data?.error?.message || 'Failed to load review moderation queue.');
      }
    } catch {
      setError('Network error loading the queue.');
    } finally {
      setLoading(false);
    }
  }

  async function decide(reviewId: string, action: string) {
    setActing(reviewId);
    setNotice(null);
    try {
      const res = await fetch(`/admin/api/moderation/professors/${reviewId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reasonNote: 'Decided from Admin Moderation Center' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotice(`Decision ${action} recorded for review ${reviewId.slice(0, 8)}.`);
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
          <p className="adx-kicker">Blind Moderation · Identity 100% hidden</p>
          <h1 className="adx-title">🎓 Professor Review Moderation</h1>
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
        <p className="adx-note">✅ No reviews pending moderation.</p>
      ) : (
        <div className="adx-list">
          {cases.map((r) => (
            <div className="adx-card" key={r.id} style={{ padding: '1.25rem' }}>
              <div className="adx-card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0 }}>Review #{r.id.slice(0, 8)}</h3>
                <span className="adx-card-kicker">
                  ★ {r.overallRating.toFixed(1)} · {r.isAnonymous ? 'Anonymous' : 'Named'} · {r.moderationStatus}
                </span>
              </div>
              <p style={{ margin: '0.75rem 0', color: 'var(--adx-text-dim, #888)' }}>
                Professor: <code>{r.professorId}</code> · {new Date(r.createdAt).toLocaleString()}
              </p>
              <blockquote
                style={{
                  margin: '0.5rem 0',
                  padding: '0.75rem',
                  background: 'rgba(0,0,0,0.05)',
                  borderRadius: '8px',
                  borderLeft: '3px solid #888'
                }}
              >
                {r.reviewText}
              </blockquote>
              <p style={{ margin: '0.25rem 0', fontSize: '0.85rem' }}>
                Author: 🔒 {r.authorUserId} · 👍 {r.helpfulCount} · 👎 {r.unhelpfulCount}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {Object.entries(ACTION_LABELS).map(([action, label]) => (
                  <button
                    key={action}
                    onClick={() => decide(r.id, action)}
                    disabled={acting === r.id}
                    className="adx-btn"
                  >
                    {acting === r.id ? 'Working…' : label}
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
