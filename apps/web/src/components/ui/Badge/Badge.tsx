import React from 'react';
import styles from './Badge.module.css';

export interface BadgeProps {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'tag';
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', onClick, children, className = '' }: BadgeProps) {
  const isInteractive = Boolean(onClick);

  return (
    <span
      className={[
        styles.badge,
        styles[variant],
        isInteractive ? styles.interactive : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {children}
    </span>
  );
}
