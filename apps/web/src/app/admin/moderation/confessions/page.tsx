'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import '@web/styles/admin.css';

interface ModerationCase {
  id: string;
  collegeId: string;
  confessionId: string;
  severityLevel: number;
  status: 'OPEN' | 'UNDER_REVIEW' | 'QUARANTINED' | 'CLOSED';
  totalReports: number;
  createdAt: string;
  authorIdentity: string;
}

const ACTION_LABELS: Record<string, string> = {
  RESTORE: '🟢 Restore',
  HIDE: '🟡 Hide',
  DELETE: '🔴 Delete',
  ESCALATE: '🔵 Escalate'
};

export default function AdminConfessionModerationPage() {
  const [cases, setCases] = useState<ModerationCase[]>([]);
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
      const res = await fetch('/admin/api/moderation/confessions', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setCases(data.data);
      } else {
        setError(data?.error?.message || 'Failed to load moderation queue.');
      }
    } catch {
      setError('Network error loading the queue.');
    } finally {
      setLoading(false);
    }
  }

  async function decide(caseId: string, action: string) {
    setActing(caseId);
    setNotice(null);
    try {
      const res = await fetch(`/admin/api/moderation/confessions/${caseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reasonNote: 'Decided from Admin Moderation Center' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotice(`Decision ${action} recorded for case ${caseId.slice(0, 8)}.`);
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
          <h1 className="adx-title">💭 Confession Moderation</h1>
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
        <p className="adx-note">✅ No pending moderation cases in queue.</p>
      ) : (
        <div className="adx-list">
          {cases.map((c) => (
            <div className="adx-card" key={c.id} style={{ padding: '1.25rem' }}>
              <div className="adx-card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0 }}>Case #{c.id.slice(0, 8)}</h3>
                <span className="adx-card-kicker">
                  Severity {c.severityLevel} · {c.totalReports} reports
                </span>
              </div>
              <p style={{ margin: '0.75rem 0', color: 'var(--adx-text-dim, #888)' }}>
                Confession: <code>{c.confessionId}</code> · Status: <strong>{c.status}</strong>
              </p>
              <p style={{ margin: '0.25rem 0', fontSize: '0.85rem' }}>
                Identity: 🔒 {c.authorIdentity} · Reported {new Date(c.createdAt).toLocaleString()}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {Object.entries(ACTION_LABELS).map(([action, label]) => (
                  <button
                    key={action}
                    onClick={() => decide(c.id, action)}
                    disabled={acting === c.id}
                    className="adx-btn"
                  >
                    {acting === c.id ? 'Working…' : label}
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
