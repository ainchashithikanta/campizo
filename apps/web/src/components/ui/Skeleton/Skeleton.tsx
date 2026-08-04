import styles from './Skeleton.module.css';

interface SkeletonProps {
  variant?: 'text' | 'circle' | 'rectangle' | 'card';
  width?: string | number;
  height?: string | number;
  lines?: number;
  className?: string;
}

export function Skeleton({ variant = 'text', width, height, lines = 1, className = '' }: SkeletonProps) {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  if (variant === 'card') {
    return (
      <div className={`${styles.card} ${className}`} role="status" aria-label="Loading...">
        <div className={styles.shimmer} style={{ width: '100%', height: '160px', borderRadius: 'var(--ch-radius-md) var(--ch-radius-md) 0 0' }} />
        <div style={{ padding: 'var(--ch-spacing-4)', display: 'flex', flexDirection: 'column', gap: 'var(--ch-spacing-2)' }}>
          <div className={styles.shimmer} style={{ width: '60%', height: '20px' }} />
          <div className={styles.shimmer} style={{ width: '80%', height: '14px' }} />
          <div className={styles.shimmer} style={{ width: '40%', height: '14px' }} />
        </div>
        <span className="visually-hidden">Loading content...</span>
      </div>
    );
  }

  if (variant === 'circle') {
    return (
      <div className={`${styles.shimmer} ${styles.circle} ${className}`} style={style} role="status" aria-label="Loading...">
        <span className="visually-hidden">Loading...</span>
      </div>
    );
  }

  return (
    <div className={className} role="status" aria-label="Loading...">
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`${styles.shimmer} ${styles[variant]}`}
          style={{ ...style, width: i === lines - 1 && lines > 1 ? '70%' : style.width }}
        />
      ))}
      <span className="visually-hidden">Loading...</span>
    </div>
  );
}
