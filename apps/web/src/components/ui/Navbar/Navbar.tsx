'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';
import { useTheme } from '@web/hooks/use-theme';

const NAV_ITEMS = [
  { href: '/confessions', label: 'Confessions', icon: '💭' },
  { href: '/academic-resources', label: 'Materials', icon: '📚' },
  { href: '/marketplace', label: 'Marketplace', icon: '🛍️' },
  { href: '/connect', label: 'Connect', icon: '🤝' },
  { href: '/placements', label: 'Placements', icon: '💼' },
  { href: '/notifications', label: 'Alerts', icon: '🔔' }
];

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className={styles.header}>
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <div className={`container ${styles.container}`}>
        <div className={styles.left}>
          <Link href="/" className={styles.brand} aria-label="Campizo Home">
            <span className={styles.logoIcon}>CZ</span>
            <span className={styles.brandText}>Campizo</span>
          </Link>

          <nav className={styles.moduleNav} aria-label="Module navigation">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.moduleLink} ${isActive(item.href) ? styles.moduleLinkActive : ''}`}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className={styles.right}>
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
              CA
            </div>
          </div>

          <button
            type="button"
            className={styles.menuToggle}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle module menu"
            aria-expanded={menuOpen}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div ref={menuRef} className={styles.mobileNav}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.mobileLink} ${isActive(item.href) ? styles.mobileLinkActive : ''}`}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
          <Link href="/professors" className={styles.mobileLink}>
            <span aria-hidden="true">⭐</span>
            <span>Professor Ratings</span>
          </Link>
          <Link href="/" className={styles.mobileLink}>
            <span aria-hidden="true">🏠</span>
            <span>Home</span>
          </Link>
        </div>
      )}
    </header>
  );
}
