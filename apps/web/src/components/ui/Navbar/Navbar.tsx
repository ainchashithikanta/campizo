'use client';

import React from 'react';
import Link from 'next/link';
import styles from './Navbar.module.css';
import { useTheme } from '@web/hooks/use-theme';

export function Navbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className={styles.header}>
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <div className={`container ${styles.container}`}>
        <div className={styles.left}>
          <Link href="/" className={styles.brand} aria-label="College Hub Home">
            <span className={styles.logoIcon}>CH</span>
            <span>College Hub</span>
          </Link>
          <span className={styles.moduleBadge}>Platform Console</span>
        </div>

        <div className={styles.right}>
          <Link
            href="/admin/feature-flags"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '12px',
              padding: '6px 12px',
              borderRadius: '8px',
              textDecoration: 'none',
              boxShadow: '0 0 12px rgba(99, 102, 241, 0.3)'
            }}
          >
            <span>⚡ Ops Console</span>
          </Link>

          <div className={styles.tenantSelector} title="Active College Tenant">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
            <span>Stanford University</span>
          </div>

          <button
            type="button"
            className={styles.themeToggle}
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>

          <div className={styles.userBadge}>
            <div className={styles.userAvatar} aria-label="Student profile avatar">
              ST
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
