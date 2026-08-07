import Link from 'next/link';
import React from 'react';
import '@web/styles/home.css';

interface ModuleCard {
  title: string;
  description: string;
  href: string;
  emoji: string;
  accent: string;
  size: 'feature' | 'medium' | 'compact';
  badge?: string;
  stats?: string;
}

const MODULES: ModuleCard[] = [
  {
    title: 'Campus Confessions',
    description:
      'Spill it anonymously. Trending confessions, crushes, rants and wild campus stories — upvote, react and reply under a safe pseudonym.',
    href: '/confessions',
    emoji: '💭',
    accent: 'violet',
    size: 'feature',
    badge: 'Trending Now',
    stats: '2.4k confessions this week'
  },
  {
    title: 'Study Materials',
    description:
      'Verified notes, PYQs, lab manuals and syllabus copies. Search by subject or semester and download in seconds.',
    href: '/academic-resources',
    emoji: '📚',
    accent: 'emerald',
    size: 'feature',
    badge: 'Most Used',
    stats: '1.8k verified resources'
  },
  {
    title: 'Campus Marketplace',
    description:
      'Buy, sell, rent and exchange textbooks, calculators, cycles and hostel gear with verified campus peers.',
    href: '/marketplace',
    emoji: '🛍️',
    accent: 'amber',
    size: 'feature',
    badge: 'Fresh Deals',
    stats: '320 live listings'
  },
  {
    title: 'Connect',
    description: 'Find study partners, join campus groups, start projects and grow your network.',
    href: '/connect',
    emoji: '🤝',
    accent: 'blue',
    size: 'medium'
  },
  {
    title: 'Placement Guidance',
    description: 'Company insights, interview experiences, roadmaps and placement discussions.',
    href: '/placements',
    emoji: '💼',
    accent: 'rose',
    size: 'medium'
  },
  {
    title: 'Notifications',
    description: 'Stay on top of replies, deal alerts and campus updates.',
    href: '/notifications',
    emoji: '🔔',
    accent: 'cyan',
    size: 'medium'
  },
  {
    title: 'Professor Ratings',
    description: 'Google-style reviews to help you pick the right classes.',
    href: '/professors',
    emoji: '⭐',
    accent: 'slate',
    size: 'compact'
  }
];

export default function HomePage() {
  return (
    <div className="hub-page">
      <section className="hub-hero">
        <div className="hub-hero-bg" aria-hidden="true" />
        <div className="container hub-hero-inner">
          <span className="hub-hero-kicker">Campizo · Your Campus, One Platform</span>
          <h1 className="hub-hero-title">
            Your campus, <span className="hub-hero-title-grad">all in one place.</span>
          </h1>
          <p className="hub-hero-subtitle">
            Confessions, study materials, marketplace deals, connections and placements — built by students, for
            students.
          </p>
          <div className="hub-hero-actions">
            <Link href="/confessions" className="hub-btn hub-btn-primary">
              💭 Join the Confessions
            </Link>
            <Link href="/marketplace/search" className="hub-btn hub-btn-ghost">
              🛍️ Browse Deals
            </Link>
          </div>
          <div className="hub-hero-stats">
            <div className="hub-stat">
              <strong>6</strong>
              <span>Modules</span>
            </div>
            <div className="hub-stat">
              <strong>4.5k+</strong>
              <span>Student posts</span>
            </div>
            <div className="hub-stat">
              <strong>100%</strong>
              <span>Anonymous &amp; safe</span>
            </div>
          </div>
        </div>
      </section>

      <section className="hub-marquee" aria-label="Campus pulse">
        <div className="hub-marquee-track">
          {[0, 1].map((dup) => (
            <React.Fragment key={dup}>
              <span className="hub-marquee-item">💭 <strong>2.4k</strong> confessions this week</span>
              <span className="hub-marquee-item">📚 <strong>1.8k</strong> verified study resources</span>
              <span className="hub-marquee-item">🛍️ <strong>320</strong> live marketplace listings</span>
              <span className="hub-marquee-item">⭐ <strong>4.5</strong> avg professor rating</span>
              <span className="hub-marquee-item">🤝 <strong>1.2k</strong> campus connections</span>
              <span className="hub-marquee-item">💼 <strong>40+</strong> companies hiring</span>
            </React.Fragment>
          ))}
        </div>
      </section>

      <section className="container hub-modules">
        <div className="hub-section-head">
          <h2>Explore the platform</h2>
          <p>Everything your campus life needs, one tap away.</p>
        </div>

        <div className="hub-grid">
          {MODULES.map((mod) => (
            <Link key={mod.href} href={mod.href} className={`hub-card hub-card-${mod.size} hub-accent-${mod.accent}`}>
              <div className="hub-card-glow" aria-hidden="true" />
              <div className="hub-card-top">
                <span className="hub-card-emoji" aria-hidden="true">
                  {mod.emoji}
                </span>
                {mod.badge && <span className="hub-card-badge">{mod.badge}</span>}
              </div>
              <div className="hub-card-body">
                <h3>{mod.title}</h3>
                <p>{mod.description}</p>
              </div>
              <div className="hub-card-footer">
                {mod.stats ? (
                  <span className="hub-card-stats">{mod.stats}</span>
                ) : (
                  <span className="hub-card-stats">Open module</span>
                )}
                <span className="hub-card-arrow" aria-hidden="true">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container hub-cta">
        <div className="hub-cta-inner">
          <div>
            <h2>Have something to get off your chest?</h2>
            <p>Every confession is fully anonymous. Share it with your campus — no judgment, no names.</p>
          </div>
          <Link href="/confessions/create" className="hub-btn hub-btn-primary hub-btn-lg">
            ✍️ Write a Confession
          </Link>
        </div>
      </section>
    </div>
  );
}
