import React from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';

const FOOTER_LINKS = [
  {
    heading: 'Modules',
    links: [
      { href: '/confessions', label: 'Confessions' },
      { href: '/academic-resources', label: 'Study Materials' },
      { href: '/marketplace', label: 'Marketplace' },
      { href: '/connect', label: 'Connect' },
      { href: '/placements', label: 'Placements' },
      { href: '/professors', label: 'Professor Ratings' }
    ]
  },
  {
    heading: 'Campus',
    links: [
      { href: '/notifications', label: 'Notifications' },
      { href: '/confessions/create', label: 'Write a Confession' },
      { href: '/marketplace/upload', label: 'Post a Listing' },
      { href: '/academic-resources/upload', label: 'Upload Resource' }
    ]
  }
];

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brandCol}>
          <Link href="/" className={styles.brand}>
            <span className={styles.logo}>CZ</span>
            <span className={styles.brandName}>Campizo</span>
          </Link>
          <p className={styles.tagline}>
            Your campus, all in one place. Confessions, materials, deals and connections — built by students, for
            students.
          </p>
        </div>

        {FOOTER_LINKS.map((col) => (
          <nav key={col.heading} className={styles.col} aria-label={col.heading}>
            <h3 className={styles.heading}>{col.heading}</h3>
            {col.links.map((l) => (
              <Link key={l.href} href={l.href} className={styles.link}>
                {l.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>

      <div className={`container ${styles.bottom}`}>
        <span>© {new Date().getFullYear()} Campizo. Made for students.</span>
        <span className={styles.legal}>Anonymous · Safe · Student-first</span>
      </div>
    </footer>
  );
}
