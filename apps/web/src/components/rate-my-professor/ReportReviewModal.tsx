'use client';

import React, { useState } from 'react';
import { Modal } from '@web/components/ui/Modal/Modal';
import { Select } from '@web/components/ui/Select/Select';
import { Input } from '@web/components/ui/Input/Input';
import { Button } from '@web/components/ui/Button/Button';
import type { ReviewDto, ReportRequest } from '@web/lib/types';

export interface ReportReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: ReviewDto | null;
  onSubmit: (reviewId: string, data: ReportRequest) => Promise<void>;
}

const REPORT_REASONS = [
  { value: 'SPAM', label: 'Spam or Bot Submission' },
  { value: 'HARASSMENT', label: 'Personal Attack / Harassment' },
  { value: 'PROFANITY', label: 'Profanity or Offensive Content' },
  { value: 'RETALIATION', label: 'Exam Retaliation / False Information' },
];

export function ReportReviewModal({ isOpen, onClose, review, onSubmit }: ReportReviewModalProps) {
  const [reason, setReason] = useState('SPAM');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!review) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit(review.id, { reason, details: details || undefined });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit report';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Report Review"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleSubmit} loading={loading}>
            Submit Report
          </Button>
        </>
      }
    >
      {success ? (
        <div style={{ textAlign: 'center', padding: 'var(--ch-spacing-4)' }}>
          <h3 style={{ fontSize: 'var(--ch-font-size-base)', fontWeight: 'bold' }}>Report Submitted</h3>
          <p style={{ color: 'var(--ch-color-text-muted)', fontSize: 'var(--ch-font-size-xs)' }}>
            Thank you. Our moderation queue will inspect this review.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ch-spacing-4)' }}>
          {error && (
            <div style={{ color: 'var(--ch-color-error)', fontSize: 'var(--ch-font-size-xs)' }}>{error}</div>
          )}

          <Select
            label="Reason for Reporting"
            options={REPORT_REASONS}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <Input
            label="Additional Details (Optional)"
            placeholder="Explain why this review breaks community rules..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </form>
      )}
    </Modal>
  );
}
