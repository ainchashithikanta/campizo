'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import '@web/styles/admin.css';

interface PlacementExperience {
  id: string;
  authorId: string;
  company?: string;
  role?: string;
  status: string;
  title?: string;
  story?: string;
  createdAt?: string;
}

interface PlacementQuestion {
  id: string;
  authorId: string;
  company?: string;
  question?: string;
  status: string;
  reportsCount?: number;
  createdAt?: string;
}

const ACTION_LABELS: Record<string, string> = {
  APPROVE: '🟢 Approve',
  FLAG: '🟡 Flag',
  DELETE: '🔴 Delete'
};

export default function AdminPlacementModerationPage() {
  const [experiences, setExperiences] = useState<PlacementExperience[]>([]);
  const [questions, setQuestions] = useState<PlacementQuestion[]>([]);
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
      const res = await fetch('/admin/api/moderation/placement', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setExperiences(Array.isArray(data.data.experiences) ? data.data.experiences : []);
        setQuestions(Array.isArray(data.data.questions) ? data.data.questions : []);
      } else {
        setError(data?.error?.message || 'Failed to load placement moderation queue.');
      }
    } catch {
      setError('Network error loading the queue.');
    } finally {
      setLoading(false);
    }
  }

  async function decide(type: 'experiences' | 'questions', id: string, action: string) {
    setActing(`${type}:${id}`);
    setNotice(null);
    try {
      const res = await fetch(`/admin/api/moderation/placement/${type}/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reasonNote: 'Decided from Admin Moderation Center' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotice(`Decision ${action} recorded for ${type} ${id.slice(0, 8)}.`);
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

  const renderActions = (type: 'experiences' | 'questions', id: string) => (
    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
      {Object.entries(ACTION_LABELS).map(([action, label]) => (
        <button
          key={action}
          onClick={() => decide(type, id, action)}
          disabled={acting === `${type}:${id}`}
          className="adx-btn"
        >
          {acting === `${type}:${id}` ? 'Working…' : label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="adx-page">
      <header className="adx-header">
        <div>
          <Link href="/admin/moderation" className="adx-back">
            ← Moderation Center
          </Link>
          <p className="adx-kicker">Blind Moderation · Author identity 100% hidden</p>
          <h1 className="adx-title">💼 Placement & Career Moderation</h1>
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
      ) : experiences.length === 0 && questions.length === 0 ? (
        <p className="adx-note">✅ No placement content pending moderation.</p>
      ) : (
        <>
          <h2 className="adx-card-title">🎯 Placement Experiences ({experiences.length})</h2>
          <div className="adx-list" style={{ marginBottom: '1.5rem' }}>
            {experiences.map((e) => (
              <div className="adx-card" key={e.id} style={{ padding: '1.25rem' }}>
                <div className="adx-card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h3 style={{ margin: 0 }}>
                    {e.title || (e.company ? `${e.company} — ${e.role || 'Role'}` : `Experience #${e.id.slice(0, 8)}`)}
                  </h3>
                  <span className="adx-card-kicker">{e.status}</span>
                </div>
                <p style={{ margin: '0.75rem 0', color: 'var(--adx-text-dim, #888)' }}>
                  ID: <code>{e.id}</code>
                  {e.createdAt ? ` · ${new Date(e.createdAt).toLocaleString()}` : ''}
                </p>
                {e.story && (
                  <blockquote
                    style={{
                      margin: '0.5rem 0',
                      padding: '0.75rem',
                      background: 'rgba(0,0,0,0.05)',
                      borderRadius: '8px',
                      borderLeft: '3px solid #888'
                    }}
                  >
                    {e.story}
                  </blockquote>
                )}
                <p style={{ margin: '0.25rem 0', fontSize: '0.85rem' }}>Author: 🔒 {e.authorId}</p>
                {renderActions('experiences', e.id)}
              </div>
            ))}
          </div>

          <h2 className="adx-card-title">❓ Interview Questions ({questions.length})</h2>
          <div className="adx-list">
            {questions.map((q) => (
              <div className="adx-card" key={q.id} style={{ padding: '1.25rem' }}>
                <div className="adx-card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h3 style={{ margin: 0 }}>
                    {q.question || (q.company ? `${q.company} question` : `Question #${q.id.slice(0, 8)}`)}
                  </h3>
                  <span className="adx-card-kicker">
                    {q.reportsCount !== undefined ? `⚠️ ${q.reportsCount} reports · ` : ''}
                    {q.status}
                  </span>
                </div>
                <p style={{ margin: '0.75rem 0', color: 'var(--adx-text-dim, #888)' }}>
                  ID: <code>{q.id}</code>
                  {q.createdAt ? ` · ${new Date(q.createdAt).toLocaleString()}` : ''}
                </p>
                <p style={{ margin: '0.25rem 0', fontSize: '0.85rem' }}>Author: 🔒 {q.authorId}</p>
                {renderActions('questions', q.id)}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
