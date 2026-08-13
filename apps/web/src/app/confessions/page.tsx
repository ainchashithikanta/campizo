'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import '../../styles/confessions.css';
import { ConfessionsApiClient, ConfessionDTO } from '../../lib/api-confessions';
import { FeedList, LoadingSkeleton, ErrorState } from '../../components/confessions/ConfessionComponents';

export default function ConfessionsFeedPage() {
  const [tab, setTab] = useState<'trending' | 'latest'>('trending');
  const [confessions, setConfessions] = useState<ConfessionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const COLLEGE = 'college-stanford-001';

  useEffect(() => {
    async function loadFeed() {
      setLoading(true);
      setError(null);
      const res = await ConfessionsApiClient.fetchFeed(COLLEGE, { tab });
      if (res.success && res.data) {
        setConfessions(res.data);
      } else {
        // Fallback mock data if API unavailable
        setConfessions([
          {
            id: 'conf-1',
            collegeId: COLLEGE,
            categoryCode: 'academic',
            title: 'CASIO FX-991ES+ Usage',
            slug: 'casio-fx-991es-usage',
            content: 'How to clear memory before entering exam hall? Press Shift + 9 + 3 + =',
            authorThreadPseudonym: 'Curious Panda #402',
            isAnonymous: true,
            status: 'PUBLISHED',
            upvotesCount: 42,
            commentsCount: 5,
            reportsCount: 0,
            rankScore: '15.5000',
            createdAt: new Date().toISOString()
          },
          {
            id: 'conf-2',
            collegeId: COLLEGE,
            categoryCode: 'funny',
            title: 'Hostel 4 Cat',
            slug: 'hostel-4-cat',
            content: 'Hostel 4 cat attended morning OS lecture and slept on first bench.',
            authorThreadPseudonym: 'Witty Owl #108',
            isAnonymous: true,
            status: 'PUBLISHED',
            upvotesCount: 88,
            commentsCount: 12,
            reportsCount: 0,
            rankScore: '32.1000',
            createdAt: new Date().toISOString()
          }
        ]);
      }
      setLoading(false);
    }

    loadFeed();
  }, [tab]);

  return (
    <div className="conf-container">
      <header className="conf-header">
        <h1 className="conf-title">💭 Campus Confessions</h1>
        <Link href="/confessions/search" className="conf-action-btn">
          🔍 Search
        </Link>
      </header>

      <section className="conf-hero">
        <div className="conf-hero-glow" />
        <div className="conf-hero-copy">
          <p className="conf-hero-kicker">Your campus. Your secrets. 100% anonymous.</p>
          <h2 className="conf-hero-title">
            Say it. Vent it. <span>Confess it.</span>
          </h2>
          <p className="conf-hero-sub">
            Share what you really think about lectures, hostels, exams and campus life — behind a pseudonym, always.
          </p>
          <div className="conf-hero-actions">
            <Link href="/confessions/create" className="conf-hero-btn">
              ✍️ Write a confession
            </Link>
            <Link href="/confessions/notifications" className="conf-hero-btn conf-hero-btn-ghost">
              🔔 Stay in the loop
            </Link>
          </div>
        </div>
        <div className="conf-hero-stats">
          <div className="conf-stat">
            <span className="conf-stat-value">2.4k</span>
            <span className="conf-stat-label">confessions this week</span>
          </div>
          <div className="conf-stat">
            <span className="conf-stat-value">98%</span>
            <span className="conf-stat-label">stay anonymous</span>
          </div>
          <div className="conf-stat">
            <span className="conf-stat-value">4.5k+</span>
            <span className="conf-stat-label">reactions shared</span>
          </div>
        </div>
      </section>

      <nav className="conf-nav">
        <button className={`conf-nav-link ${tab === 'trending' ? 'active' : ''}`} onClick={() => setTab('trending')}>
          🔥 Trending
        </button>
        <button className={`conf-nav-link ${tab === 'latest' ? 'active' : ''}`} onClick={() => setTab('latest')}>
          ✨ Latest
        </button>{' '}
        <Link href="/confessions/bookmarks" className="conf-nav-link">
          🔖 Bookmarks
        </Link>
        <Link href="/confessions/activity" className="conf-nav-link">
          ⚡ Activity
        </Link>
        <Link href="/confessions/notifications" className="conf-nav-link">
          🔔 Notifications
        </Link>
      </nav>

      <div className="conf-category-chips" role="group" aria-label="Confession categories">
        {['💭 All', '❤️ Crush', '🎓 Academic', '😂 Funny', '😤 Rant', '🍕 Food', '🏠 Hostel'].map((c) => (
          <button key={c} type="button" className="conf-chip">
            {c}
          </button>
        ))}
      </div>

      {error && <ErrorState message={error} />}
      {loading ? <LoadingSkeleton /> : <FeedList confessions={confessions} />}

      <Link href="/confessions/create" className="conf-fab" aria-label="Create confession">
        ✍️
      </Link>
    </div>
  );
}
