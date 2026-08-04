'use client';

import React, { useState } from 'react';
import styles from './ReviewCard.module.css';
import { RatingBadge } from '@web/components/ui/RatingBadge/RatingBadge';
import { StarRating } from '@web/components/ui/StarRating/StarRating';
import { Badge } from '@web/components/ui/Badge/Badge';
import { Button } from '@web/components/ui/Button/Button';
import type { ReviewDto } from '@web/lib/types';
import { formatRelativeTime } from '@web/lib/types';

export interface ReviewCardProps {
  review: ReviewDto;
  onVote: (reviewId: string, type: 'HELPFUL' | 'UNHELPFUL') => Promise<void>;
  onReport: (review: ReviewDto) => void;
  onEdit?: (review: ReviewDto) => void;
  onDelete?: (reviewId: string) => void;
  onFacultyRespond?: (review: ReviewDto) => void;
}

export function ReviewCard({
  review,
  onVote,
  onReport,
  onEdit,
  onDelete,
  onFacultyRespond,
}: ReviewCardProps) {
  const [userVote, setUserVote] = useState<'HELPFUL' | 'UNHELPFUL' | null>(review.userVote || null);
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount || 0);
  const [unhelpfulCount, setUnhelpfulCount] = useState(review.unhelpfulCount || 0);
  const [voting, setVoting] = useState(false);

  const handleVoteClick = async (type: 'HELPFUL' | 'UNHELPFUL') => {
    if (voting) return;
    setVoting(true);

    try {
      if (userVote === type) {
        // Toggle off
        setUserVote(null);
        if (type === 'HELPFUL') setHelpfulCount((c) => Math.max(0, c - 1));
        else setUnhelpfulCount((c) => Math.max(0, c - 1));
      } else {
        if (userVote === 'HELPFUL') setHelpfulCount((c) => Math.max(0, c - 1));
        if (userVote === 'UNHELPFUL') setUnhelpfulCount((c) => Math.max(0, c - 1));

        setUserVote(type);
        if (type === 'HELPFUL') setHelpfulCount((c) => c + 1);
        else setUnhelpfulCount((c) => c + 1);
      }

      await onVote(review.id, type);
    } catch {
      // Revert state on error
      setUserVote(review.userVote || null);
      setHelpfulCount(review.helpfulCount || 0);
      setUnhelpfulCount(review.unhelpfulCount || 0);
    } finally {
      setVoting(false);
    }
  };

  const authorName = review.isAnonymous
    ? `Anonymous Student (${review.authorAnonymousToken?.slice(0, 8) || 'verified'})`
    : review.authorDisplayName || 'Verified Student';

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.authorMeta}>
          <span className={styles.authorName}>{authorName}</span>
          <Badge variant="success">Verified .edu</Badge>
          <span className={styles.time}>{formatRelativeTime(review.createdAt)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StarRating value={review.overallRating} size="sm" />
          <RatingBadge rating={review.overallRating} size="sm" showLabel={false} />
        </div>
      </div>

      <div className={styles.courseRow}>
        <span className={styles.courseBadge}>{review.courseCode}</span>
        <span>{review.courseName}</span>
        <span>•</span>
        <span>{review.semester} ({review.academicYear})</span>
        {review.gradeReceived && (
          <Badge variant="primary">Grade: {review.gradeReceived}</Badge>
        )}
      </div>

      <p className={styles.text}>{review.reviewText}</p>

      {review.tags && review.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {review.tags.map((t) => (
            <Badge key={t} variant="tag">
              #{t}
            </Badge>
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <div className={styles.voteGroup}>
          <button
            type="button"
            className={`${styles.voteButton} ${userVote === 'HELPFUL' ? styles.votedHelpful : ''}`}
            onClick={() => handleVoteClick('HELPFUL')}
            aria-label={`Vote helpful (${helpfulCount})`}
          >
            👍 Helpful ({helpfulCount})
          </button>
          <button
            type="button"
            className={`${styles.voteButton} ${userVote === 'UNHELPFUL' ? styles.votedUnhelpful : ''}`}
            onClick={() => handleVoteClick('UNHELPFUL')}
            aria-label={`Vote unhelpful (${unhelpfulCount})`}
          >
            👎 Unhelpful ({unhelpfulCount})
          </button>
        </div>

        <div className={styles.actionGroup}>
          {review.isEditable && (
            <>
              {onEdit && (
                <Button variant="ghost" size="sm" onClick={() => onEdit(review)}>
                  Edit (24h)
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="sm" onClick={() => onDelete(review.id)}>
                  Delete
                </Button>
              )}
            </>
          )}

          {onFacultyRespond && !review.facultyResponse && (
            <Button variant="outline" size="sm" onClick={() => onFacultyRespond(review)}>
              Faculty Reply
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={() => onReport(review)} aria-label="Report review">
            🚩 Report
          </Button>
        </div>
      </div>

      {review.facultyResponse && (
        <div className={styles.facultyResponse}>
          <div className={styles.facultyResponseHeader}>
            <span>Verified Faculty Response</span>
            <span style={{ fontSize: 'var(--ch-font-size-xs)', color: 'var(--ch-color-text-muted)' }}>
              {formatRelativeTime(review.facultyResponse.respondedAt)}
            </span>
          </div>
          <p className={styles.facultyResponseText}>{review.facultyResponse.responseText}</p>
        </div>
      )}
    </div>
  );
}
