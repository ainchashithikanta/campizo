'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../../../../styles/confessions.css';
import { ConfessionsApiClient } from '../../../../lib/api-confessions';

export default function ModeratorReviewPage({ params }: { params: Promise<{ caseId: string }> }) {
  const resolvedParams = use(params);
  const caseId = resolvedParams.caseId;
  const router = useRouter();

  const [reasonNote, setReasonNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const COLLEGE = 'college-stanford-001';

  const handleDecision = async (action: 'RESTORE' | 'HIDE' | 'DELETE' | 'ESCALATE') => {
    setIsSubmitting(true);
    const res = await ConfessionsApiClient.submitModerationDecision(caseId, COLLEGE, {
      action,
      reasonNote
    });

    if (res.success) {
      router.push('/confessions/moderation');
    } else {
      alert(`Error submitting decision: ${res.error?.message || 'Unknown error'}`);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="conf-container">
      <header className="conf-header">
        <Link href="/confessions/moderation" className="conf-action-btn">
          ← Queue
        </Link>
        <h1 className="conf-title">🛡️ Review Case #{caseId.slice(0, 8)}</h1>
      </header>

      <div className="conf-card">
        <div style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: 'var(--conf-radius-sm)', marginBottom: '1rem', fontSize: '0.85rem' }}>
          🔒 Blind Moderation: Author identity is 100% hidden.
        </div>

        <div className="conf-form-group">
          <label className="conf-label" htmlFor="mod-note">Moderator Note / Rationale</label>
          <textarea
            id="mod-note"
            className="conf-textarea"
            rows={3}
            value={reasonNote}
            onChange={(e) => setReasonNote(e.target.value)}
            placeholder="Explain moderation rationale..."
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button
            onClick={() => handleDecision('RESTORE')}
            disabled={isSubmitting}
            style={{ padding: '0.8rem', borderRadius: 'var(--conf-radius-sm)', background: 'var(--conf-accent-success)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
          >
            🟢 Restore
          </button>

          <button
            onClick={() => handleDecision('HIDE')}
            disabled={isSubmitting}
            style={{ padding: '0.8rem', borderRadius: 'var(--conf-radius-sm)', background: 'var(--conf-accent-warning)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
          >
            🟡 Hide
          </button>

          <button
            onClick={() => handleDecision('DELETE')}
            disabled={isSubmitting}
            style={{ padding: '0.8rem', borderRadius: 'var(--conf-radius-sm)', background: 'var(--conf-accent-danger)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
          >
            🔴 Delete
          </button>

          <button
            onClick={() => handleDecision('ESCALATE')}
            disabled={isSubmitting}
            style={{ padding: '0.8rem', borderRadius: 'var(--conf-radius-sm)', background: 'var(--conf-accent-primary)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
          >
            🔵 Escalate
          </button>
        </div>
      </div>
    </div>
  );
}
