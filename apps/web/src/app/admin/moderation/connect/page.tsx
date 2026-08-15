'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import '@web/styles/admin.css';

interface ConnectModerationCase {
  id: string;
  collegeId: string;
  reportedUserId: string;
  reporterUserId: string;
  reasonCategory: string;
  severityLevel: string;
  status: string;
  createdAt?: string;
}

const ACTION_LABELS: Record<string, string> = {
  WARN: '🟡 Warn',
  SUSPEND: '🟠 Suspend',
  BAN: '🔴 Ban',
  DISMISS: '🟢 Dismiss'
};

export default function AdminConnectModerationPage() {
  const [cases, setCases] = useState<ConnectModerationCase[]>([]);
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
      const res = await fetch('/admin/api/moderation/connect', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        const queue = Array.isArray(data.data) ? data.data : data.data.queue;
        if (Array.isArray(queue)) {
          setCases(queue);
        } else {
          setError('Unexpected queue shape from API.');
        }
      } else {
        setError(data?.error?.message || 'Failed to load connect moderation queue.');
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
      const res = await fetch(`/admin/api/moderation/connect/${caseId}`, {
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
          <p className="adx-kicker">Blind Moderation · Identities 100% hidden</p>
          <h1 className="adx-title">🤝 Campus Connect Moderation</h1>
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
        <p className="adx-note">✅ No connect moderation cases pending.</p>
      ) : (
        <div className="adx-list">
          {cases.map((c) => (
            <div className="adx-card" key={c.id} style={{ padding: '1.25rem' }}>
              <div className="adx-card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0 }}>Case #{c.id.slice(0, 8)}</h3>
                <span className="adx-card-kicker">
                  {c.severityLevel} · {c.status}
                </span>
              </div>
              <p style={{ margin: '0.75rem 0', color: 'var(--adx-text-dim, #888)' }}>
                Reason: <code>{c.reasonCategory}</code>
                {c.createdAt ? ` · ${new Date(c.createdAt).toLocaleString()}` : ''}
              </p>
              <p style={{ margin: '0.25rem 0', fontSize: '0.85rem' }}>
                Reported user: 🔒 {c.reportedUserId} · Reporter: 🔒 {c.reporterUserId}
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
