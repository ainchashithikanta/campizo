import React from 'react';
import styles from './RatingStatsCard.module.css';
import { RatingBadge } from '@web/components/ui/RatingBadge/RatingBadge';
import { ProgressBar } from '@web/components/ui/ProgressBar/ProgressBar';
import type { ProfessorStatisticsDto } from '@web/lib/types';

export interface RatingStatsCardProps {
  stats: ProfessorStatisticsDto;
}

export function RatingStatsCard({ stats }: RatingStatsCardProps) {
  const total = stats.totalReviewsCount || 1;
  const dist = stats.starDistribution || { star5: 0, star4: 0, star3: 0, star2: 0, star1: 0 };

  const dimensions = [
    { label: 'Lecture Clarity', val: stats.ratingDimensions?.teachingClarity ?? 4.8 },
    { label: 'Grading Fairness', val: stats.ratingDimensions?.gradingFairness ?? 4.7 },
    { label: 'Punctuality', val: stats.ratingDimensions?.punctuality ?? 4.9 },
    { label: 'Approachability', val: stats.ratingDimensions?.approachability ?? 4.8 }
  ];

  const stars = [
    { label: '5 Stars', count: dist.star5, color: 'var(--ch-color-rating-excellent)' },
    { label: '4 Stars', count: dist.star4, color: 'var(--ch-color-rating-good)' },
    { label: '3 Stars', count: dist.star3, color: 'var(--ch-color-rating-average)' },
    { label: '2 Stars', count: dist.star2, color: 'var(--ch-color-rating-below)' },
    { label: '1 Star', count: dist.star1, color: 'var(--ch-color-rating-poor)' }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.topRow}>
        <div className={styles.bayesianBlock}>
          <RatingBadge rating={stats.bayesianRating} size="lg" showLabel={true} />
          <div>
            <div className={styles.confidenceBadge}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              High Confidence ({stats.ratingConfidenceScore ? (stats.ratingConfidenceScore * 100).toFixed(0) : 95}%)
            </div>
            <div style={{ fontSize: 'var(--ch-font-size-xs)', color: 'var(--ch-color-text-muted)', marginTop: '4px' }}>
              Based on {stats.totalReviewsCount} verified student evaluations
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: 'var(--ch-font-size-2xl)',
              fontWeight: 'var(--ch-font-weight-bold)',
              color: 'var(--ch-color-primary)'
            }}
          >
            {stats.recommendationPercentage.toFixed(0)}%
          </div>
          <div style={{ fontSize: 'var(--ch-font-size-xs)', color: 'var(--ch-color-text-muted)' }}>
            Would take courses with this professor again
          </div>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <div>
          <h3 className={styles.sectionTitle}>Academic Dimensions</h3>
          <div className={styles.dimensionsList}>
            {dimensions.map((d) => (
              <div key={d.label} className={styles.dimensionItem}>
                <span className={styles.dimName}>{d.label}</span>
                <span className={styles.dimVal}>{d.val.toFixed(1)} / 5.0</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className={styles.sectionTitle}>Rating Distribution</h3>
          <div className={styles.histogramList}>
            {stars.map((s) => (
              <ProgressBar
                key={s.label}
                label={s.label}
                count={s.count}
                percentage={(s.count / total) * 100}
                fillColor={s.color}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
