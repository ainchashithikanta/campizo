'use client';

import { useState, useCallback } from 'react';
import styles from './StarRating.module.css';

interface StarRatingProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (value: number) => void;
  label?: string;
}

export function StarRating({ value, max = 5, size = 'md', interactive = false, onChange, label }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const displayValue = hoverValue ?? value;

  const handleClick = useCallback(
    (starIndex: number) => {
      if (interactive && onChange) onChange(starIndex);
    },
    [interactive, onChange]
  );

  return (
    <div
      className={`${styles.container} ${styles[size]}`}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={label || `Rating: ${value} out of ${max} stars`}
    >
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const fillPercent = Math.min(1, Math.max(0, displayValue - i)) * 100;

        return (
          <button
            key={i}
            type="button"
            className={`${styles.star} ${interactive ? styles.interactive : ''}`}
            onClick={() => handleClick(starValue)}
            onMouseEnter={() => interactive && setHoverValue(starValue)}
            onMouseLeave={() => interactive && setHoverValue(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick(starValue);
              }
            }}
            disabled={!interactive}
            tabIndex={interactive ? 0 : -1}
            aria-label={`${starValue} star${starValue > 1 ? 's' : ''}`}
            aria-pressed={interactive ? starValue <= value : undefined}
          >
            <svg viewBox="0 0 24 24" className={styles.starSvg}>
              <defs>
                <linearGradient id={`fill-${i}-${Math.round(fillPercent)}`}>
                  <stop offset={`${fillPercent}%`} stopColor="var(--ch-color-accent)" />
                  <stop offset={`${fillPercent}%`} stopColor="var(--ch-color-border)" />
                </linearGradient>
              </defs>
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"
                fill={`url(#fill-${i}-${Math.round(fillPercent)})`}
                stroke="none"
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
