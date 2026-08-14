/**
 * Campus Connect — Main Landing & Overview Hub Page
 * Route: /connect
 */

import React from 'react';
import Link from 'next/link';
import '@web/styles/connect.css';

export default function ConnectHubPage() {
  const navLinks = [
    {
      title: 'Random Chat',
      href: '/connect/random',
      desc: 'Anonymous end-to-end encrypted chat matched with the opposite gender',
      icon: '🎲',
      accent: 'violet'
    },
    {
      title: 'Discover Students',
      href: '/connect/discover',
      desc: 'Find study pods and project collaborators',
      icon: '🔍',
      accent: 'cyan'
    },
    {
      title: 'Recommendations',
      href: '/connect/recommendations',
      desc: 'AI-matched compatibility profiles',
      icon: '✨',
      accent: 'pink'
    },
    { title: 'My Network', href: '/connect/network', desc: 'Manage your campus connections and requests', icon: '👥', accent: 'mint' },
    { title: 'Messages', href: '/connect/messages', desc: 'Chat with contextual study pods and mentors', icon: '💬', accent: 'lemon' },
    { title: 'Study Pods', href: '/connect/study', desc: 'Join or create course-based study groups', icon: '📚', accent: 'violet' },
    { title: 'Project Teams', href: '/connect/projects', desc: 'Build hackathon and course teams', icon: '🚀', accent: 'coral' },
    { title: 'Mentorship', href: '/connect/mentorship', desc: 'Peer-to-peer student mentorship', icon: '🎓', accent: 'cyan' },
    { title: 'Activity Feed', href: '/connect/activity', desc: 'View campus activity log', icon: '⚡', accent: 'pink' },
    { title: 'Privacy Center', href: '/connect/privacy', desc: 'Manage ghost mode and incognito settings', icon: '🔒', accent: 'mint' }
  ];

  return (
    <main className="cn-page">
      <div className="cn-container">
        <header className="cn-hero">
          <div className="cn-hero-glow" aria-hidden="true" />
          <div className="cn-hero-copy">
            <p className="cn-hero-kicker">Campus Connect</p>
            <h1 className="cn-hero-title">
              Find your people, <span>build together</span>
            </h1>
            <p className="cn-hero-sub">
              Study pods, project teams, mentors, and meaningful conversations — all with verified students from your
              campus.
            </p>
          </div>
          <div className="cn-hero-stats">
            <div className="cn-stat">
              <span className="cn-stat-value">1.2k+</span>
              <span className="cn-stat-label">campus connections</span>
            </div>
            <div className="cn-stat">
              <span className="cn-stat-value">350+</span>
              <span className="cn-stat-label">study pods formed</span>
            </div>
            <div className="cn-stat">
              <span className="cn-stat-value">100%</span>
              <span className="cn-stat-label">verified students</span>
            </div>
          </div>
        </header>

        <div className="cn-section-head">
          <h2>Explore Connect</h2>
          <p>Everything you need to connect, collaborate, and grow.</p>
        </div>

        <div className="cn-grid">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`cn-card cn-card-accent-${item.accent}`}
            >
              <div>
                <span className="cn-card-emoji" aria-hidden="true">{item.icon}</span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
              <span className="cn-card-arrow">Open Section →</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}