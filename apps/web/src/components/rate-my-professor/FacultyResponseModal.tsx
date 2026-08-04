'use client';

import React, { useState } from 'react';
import { Modal } from '@web/components/ui/Modal/Modal';
import { Button } from '@web/components/ui/Button/Button';
import type { ReviewDto, FacultyResponseRequest } from '@web/lib/types';

export interface FacultyResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: ReviewDto | null;
  onSubmit: (reviewId: string, data: FacultyResponseRequest) => Promise<void>;
}

export function FacultyResponseModal({ isOpen, onClose, review, onSubmit }: FacultyResponseModalProps) {
  const [responseText, setResponseText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!review) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (responseText.length < 10) {
      setError('Response text must be at least 10 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit(review.id, { responseText });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit response';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Verified Faculty Counter-Response"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            Post Verified Response
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ch-spacing-4)' }}>
        {error && <div style={{ color: 'var(--ch-color-error)', fontSize: 'var(--ch-font-size-xs)' }}>{error}</div>}

        <p style={{ fontSize: 'var(--ch-font-size-xs)', color: 'var(--ch-color-text-muted)' }}>
          Your response will be highlighted with a <strong>Verified Faculty Response</strong> badge directly under the
          student&apos;s review.
        </p>

        <textarea
          style={{
            width: '100%',
            minHeight: '120px',
            padding: 'var(--ch-spacing-3)',
            fontSize: 'var(--ch-font-size-sm)',
            fontFamily: 'var(--ch-font-sans)',
            backgroundColor: 'var(--ch-color-surface)',
            border: '1px solid var(--ch-color-border)',
            borderRadius: 'var(--ch-radius-md)',
            color: 'var(--ch-color-text)'
          }}
          placeholder="Provide clarifying context regarding course policies, grading rubrics, or attendance requirements..."
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
          maxLength={1000}
        />
      </form>
    </Modal>
  );
}
