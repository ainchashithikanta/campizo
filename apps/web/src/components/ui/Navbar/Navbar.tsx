'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import styles from './Navbar.module.css';
import { useTheme } from '@web/hooks/use-theme';
import { useAuth } from '@web/components/auth/AuthContext';

const NAV_ITEMS = [
  { href: '/confessions', label: 'Confessions', icon: '💭' },
  { href: '/academic-resources', label: 'Materials', icon: '📚' },
  { href: '/marketplace', label: 'Marketplace', icon: '🛍️' },
  { href: '/connect', label: 'Connect', icon: '🤝' },
  { href: '/placements', label: 'Placements', icon: '💼' },
  { href: '/notifications', label: 'Alerts', icon: '🔔' }
];

const ADMIN_LINK = { href: '/admin', label: 'Admin', icon: '🛡️' };

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
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

          {user ? (
            <>
              <span className={styles.userBadge} title={user.email}>
                <span className={styles.userAvatar}>{user.fullName?.charAt(0) ?? 'S'}</span>
                <span className="hidden sm:inline text-xs font-medium">{user.fullName || 'Student'}</span>
                <span className="text-xs opacity-60" title={user.gender}>
                  {user.gender === 'MALE' ? '♂️' : user.gender === 'FEMALE' ? '♀️' : ''}
                </span>
              </span>
              <button
                type="button"
                onClick={() => router.push('/admin')}
                className={styles.themeToggle}
                aria-label="Admin console"
                title="Admin console"
              >
                🛡️
              </button>
              <button
                type="button"
                onClick={logout}
                className={styles.themeToggle}
                aria-label="Log out"
                title="Log out"
              >
                ⤧
              </button>
            </>
          ) : (
            <>
              <Link href="/admin" className={styles.themeToggle} aria-label="Admin" title="Admin">
                🛡️
              </Link>
              <Link
                href="/college?next=/sign-in"
                className={styles.authButton}
                aria-label="Sign in"
                title="Sign in"
              >
                Sign in
              </Link>
              <Link
                href="/college?next=/sign-up"
                className={styles.authButton}
                aria-label="Sign up"
                title="Sign up"
              >
                Sign up
              </Link>
            </>
          )}

          <span className={styles.clerkUserButton}>
            <UserButton />
          </span>

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
            <Link href={ADMIN_LINK.href} className={styles.mobileLink}>
              <span aria-hidden="true">{ADMIN_LINK.icon}</span>
              <span>{ADMIN_LINK.label}</span>
            </Link>
            {user ? (
              <button type="button" onClick={logout} className={styles.mobileLink}>
                <span>🙋</span>
                <span>Log out</span>
              </button>
            ) : (
              <Link href="/college?next=/sign-up" className={styles.mobileLink}>
                <span>🔐</span>
                <span>Sign up</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
