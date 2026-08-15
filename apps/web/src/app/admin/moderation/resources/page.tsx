'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import '@web/styles/admin.css';

interface AcademicResource {
  id: string;
  collegeId: string;
  departmentId: string;
  subjectId: string;
  uploaderUserId: string;
  title: string;
  slug: string;
  description?: string;
  academicYear: string;
  semesterNumber: number;
  isAnonymous: boolean;
  status: string;
  verificationStatus: string;
  createdAt?: string;
}

const ACTION_LABELS: Record<string, string> = {
  APPROVE: '🟢 Approve',
  HIDE: '🟡 Hide',
  DELETE: '🔴 Reject'
};

export default function AdminResourceModerationPage() {
  const [cases, setCases] = useState<AcademicResource[]>([]);
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
      const res = await fetch('/admin/api/moderation/resources', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setCases(data.data);
      } else {
        setError(data?.error?.message || 'Failed to load academic resources moderation queue.');
      }
    } catch {
      setError('Network error loading the queue.');
    } finally {
      setLoading(false);
    }
  }

  async function decide(resourceId: string, action: string) {
    setActing(resourceId);
    setNotice(null);
    try {
      const res = await fetch(`/admin/api/moderation/resources/${resourceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reasonNote: 'Decided from Admin Moderation Center' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotice(`Decision ${action} recorded for resource ${resourceId.slice(0, 8)}.`);
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
          <p className="adx-kicker">Blind Moderation · Uploader identity 100% hidden</p>
          <h1 className="adx-title">📚 Academic Resources Moderation</h1>
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
        <p className="adx-note">✅ No resources pending moderation.</p>
      ) : (
        <div className="adx-list">
          {cases.map((r) => (
            <div className="adx-card" key={r.id} style={{ padding: '1.25rem' }}>
              <div className="adx-card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0 }}>{r.title}</h3>
                <span className="adx-card-kicker">
                  Sem {r.semesterNumber} · {r.academicYear} · {r.status}
                </span>
              </div>
              <p style={{ margin: '0.75rem 0', color: 'var(--adx-text-dim, #888)' }}>
                Resource: <code>{r.id}</code> · Dept: <code>{r.departmentId}</code> · {r.verificationStatus}
                {r.createdAt ? ` · ${new Date(r.createdAt).toLocaleString()}` : ''}
              </p>
              {r.description && (
                <blockquote
                  style={{
                    margin: '0.5rem 0',
                    padding: '0.75rem',
                    background: 'rgba(0,0,0,0.05)',
                    borderRadius: '8px',
                    borderLeft: '3px solid #888'
                  }}
                >
                  {r.description}
                </blockquote>
              )}
              <p style={{ margin: '0.25rem 0', fontSize: '0.85rem' }}>
                Uploader: 🔒 {r.uploaderUserId} · {r.isAnonymous ? 'Anonymous' : 'Named'}
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
