import React from 'react';
import Link from 'next/link';
import styles from './ProfessorCard.module.css';
import { RatingBadge } from '@web/components/ui/RatingBadge/RatingBadge';
import { Badge } from '@web/components/ui/Badge/Badge';
import type { ProfessorSummaryDto } from '@web/lib/types';
import { getInitials } from '@web/lib/types';

export interface ProfessorCardProps {
  professor: ProfessorSummaryDto;
}

export function ProfessorCard({ professor }: ProfessorCardProps) {
  const initials = getInitials(professor.fullName);

  return (
    <Link
      href={`/professors/${professor.slug}`}
      className={styles.card}
      aria-label={`View profile for ${professor.fullName}, rating ${professor.bayesianRating.toFixed(1)} out of 5`}
    >
      <div className={styles.header}>
        <div className={styles.profInfo}>
          <div className={styles.avatar}>{initials}</div>
          <div>
            <h3 className={styles.name}>{professor.fullName}</h3>
            <div className={styles.designation}>{professor.designation}</div>
            <div className={styles.deptBadge}>{professor.departmentName || professor.departmentCode}</div>
          </div>
        </div>
        <RatingBadge rating={professor.bayesianRating} size="sm" showLabel={false} />
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Would Retake</span>
          <span className={styles.statValue}>{professor.recommendationPercentage.toFixed(0)}%</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Reviews</span>
          <span className={styles.statValue}>{professor.totalReviewsCount}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Bayesian Score</span>
          <span className={styles.statValue}>{professor.bayesianRating.toFixed(2)}</span>
        </div>
      </div>

      {professor.topTags && professor.topTags.length > 0 && (
        <div className={styles.tagsRow}>
          {professor.topTags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="tag">
              #{tag}
            </Badge>
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <span className={styles.footerLink}>
          View Full Profile & Reviews
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
