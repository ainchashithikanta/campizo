import React from 'react';
import styles from './ProgressBar.module.css';

export interface ProgressBarProps {
  label: string;
  percentage: number;
  count: number;
  fillColor?: string;
}

export function ProgressBar({ label, percentage, count, fillColor }: ProgressBarProps) {
  const clampPercent = Math.min(100, Math.max(0, percentage));

  return (
    <div className={styles.container}>
      <span className={styles.label}>{label}</span>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={clampPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${count} reviews (${clampPercent.toFixed(0)}%)`}
      >
        <div
          className={styles.fill}
          style={{
            width: `${clampPercent}%`,
            backgroundColor: fillColor,
          }}
        />
      </div>
      <span className={styles.value}>{count}</span>
    </div>
  );
}
