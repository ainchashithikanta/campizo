'use client';

import React, { useState } from 'react';
import styles from './WriteReviewModal.module.css';
import { Modal } from '@web/components/ui/Modal/Modal';
import { StarRating } from '@web/components/ui/StarRating/StarRating';
import { Select } from '@web/components/ui/Select/Select';
import { Button } from '@web/components/ui/Button/Button';
import type { ReviewCreateRequest, ProfessorProfileDto } from '@web/lib/types';

export interface WriteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: ProfessorProfileDto;
  onSubmit: (data: ReviewCreateRequest) => Promise<void>;
}

const COURSES = [
  { value: 'course-101-uuid', label: 'CS101 — Introduction to Computer Science' },
  { value: 'course-102-uuid', label: 'CS201 — Data Structures & Algorithms' },
  { value: 'course-103-uuid', label: 'CS301 — Operating Systems' }
];

const GRADES = [
  { value: 'A+', label: 'A+ (Excellent)' },
  { value: 'A', label: 'A (Very Good)' },
  { value: 'B', label: 'B (Good)' },
  { value: 'C', label: 'C (Average)' },
  { value: 'F', label: 'F (Fail)' },
  { value: 'PASSED', label: 'Passed / Audit' }
];

export function WriteReviewModal({ isOpen, onClose, profile, onSubmit }: WriteReviewModalProps) {
  const [courseAssignmentId, setCourseAssignmentId] = useState('course-101-uuid');
  const [overallRating, setOverallRating] = useState(5);
  const [teachingClarity, setTeachingClarity] = useState(5);
  const [gradingFairness, setGradingFairness] = useState(5);
  const [punctuality, setPunctuality] = useState(5);
  const [approachability, setApproachability] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [gradeReceived, setGradeReceived] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewText.length < 20) {
      setError('Review text must be at least 20 characters long.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await onSubmit({
        courseAssignmentId,
        reviewText,
        overallRating,
        isAnonymous,
        gradeReceived: gradeReceived || undefined,
        dimensions: {
          teachingClarity,
          gradingFairness,
          punctuality,
          approachability
        }
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit review';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Rate ${profile.fullName}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            Submit Verified Review
          </Button>
        </>
      }
    >
      {success ? (
        <div style={{ textAlign: 'center', padding: 'var(--ch-spacing-6)' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
          <h3 style={{ fontSize: 'var(--ch-font-size-lg)', fontWeight: 'bold' }}>Review Submitted!</h3>
          <p style={{ color: 'var(--ch-color-text-muted)', marginTop: '4px' }}>
            Thank you! Your anonymous evaluation helps fellow students make better course choices.
          </p>
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                padding: 'var(--ch-spacing-3)',
                backgroundColor: 'var(--ch-color-error-bg)',
                color: 'var(--ch-color-error)',
                borderRadius: 'var(--ch-radius-md)',
                fontSize: 'var(--ch-font-size-xs)'
              }}
            >
              {error}
            </div>
          )}

          <Select
            label="Select Course Taken"
            options={COURSES}
            value={courseAssignmentId}
            onChange={(e) => setCourseAssignmentId(e.target.value)}
          />

          <div className={styles.ratingSection}>
            <span className={styles.ratingLabel}>Overall Professor Rating</span>
            <StarRating value={overallRating} size="lg" interactive={true} onChange={setOverallRating} />
          </div>

          <div className={styles.dimensionsGrid}>
            <div className={styles.dimRow}>
              <span className={styles.dimTitle}>Lecture Clarity</span>
              <StarRating value={teachingClarity} size="sm" interactive={true} onChange={setTeachingClarity} />
            </div>
            <div className={styles.dimRow}>
              <span className={styles.dimTitle}>Grading Fairness</span>
              <StarRating value={gradingFairness} size="sm" interactive={true} onChange={setGradingFairness} />
            </div>
            <div className={styles.dimRow}>
              <span className={styles.dimTitle}>Punctuality</span>
              <StarRating value={punctuality} size="sm" interactive={true} onChange={setPunctuality} />
            </div>
            <div className={styles.dimRow}>
              <span className={styles.dimTitle}>Approachability</span>
              <StarRating value={approachability} size="sm" interactive={true} onChange={setApproachability} />
            </div>
          </div>

          <div className={styles.textareaWrapper}>
            <label htmlFor="review-text" className={styles.textareaLabel}>
              Written Feedback (Min 20, Max 1000 chars)
            </label>
            <textarea
              id="review-text"
              className={styles.textarea}
              placeholder="Describe teaching style, exam patterns, lab assignments, attendance policies..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              maxLength={1000}
            />
            <div className={styles.charCounter}>{reviewText.length} / 1000</div>
          </div>

          <Select
            label="Grade Received (Optional)"
            placeholder="Select Grade"
            options={GRADES}
            value={gradeReceived}
            onChange={(e) => setGradeReceived(e.target.value)}
          />

          <div className={styles.toggleRow}>
            <div>
              <div className={styles.toggleLabel}>Post Anonymously</div>
              <div className={styles.toggleSub}>Hides your identity using blind HMAC verification</div>
            </div>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              aria-label="Post Anonymously"
            />
          </div>
        </form>
      )}
    </Modal>
  );
}
