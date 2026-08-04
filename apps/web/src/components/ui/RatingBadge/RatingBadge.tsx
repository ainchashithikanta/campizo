import styles from './RatingBadge.module.css';
import { getRatingQuality, getRatingLabel } from '@web/lib/types';

interface RatingBadgeProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function RatingBadge({ rating, size = 'md', showLabel = true }: RatingBadgeProps) {
  const quality = getRatingQuality(rating);
  const label = getRatingLabel(quality);

  return (
    <div className={`${styles.container} ${styles[size]}`}>
      <div className={`${styles.badge} ${styles[quality]}`} aria-label={`Rating ${rating.toFixed(1)} out of 5 - ${label}`}>
        <span className={styles.value}>{rating.toFixed(1)}</span>
        <span className={styles.max}>/5</span>
      </div>
      {showLabel && <span className={`${styles.label} ${styles[quality]}`}>{label}</span>}
    </div>
  );
}
