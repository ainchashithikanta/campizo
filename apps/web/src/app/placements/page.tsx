/**
 * Placement Guidance — Hub & Catalog Feed Page
 * Route: /placements
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import '@web/styles/placements.css';
import { PlacementCard } from '../../components/placements/placement-components';
import { SearchBar } from '../../components/connect/search-filter-components';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../components/connect/state-components';
import { fetchPlacements, type PlacementExperience } from '../../lib/api-placement-guidance';

export default function PlacementHubPage() {
  const [experiences, setExperiences] = useState<PlacementExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchPlacements()
      .then((res) => {
        setExperiences(res.items || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load placement experiences');
        setLoading(false);
      });
  }, []);

  const filtered = experiences.filter((e) => {
    const matchesSearch =
      !searchQuery ||
      e.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.roleTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesJobType = !jobTypeFilter || e.jobType === jobTypeFilter;
    return matchesSearch && matchesJobType;
  });

  return (
    <main className="pl-page">
      <div className="pl-container">
        <header className="pl-hero">
          <div className="pl-hero-glow" aria-hidden="true" />
          <div className="pl-hero-copy">
            <p className="pl-hero-kicker">Placement Guidance Hub</p>
            <h1 className="pl-hero-title">
              Crack your dream job, <span>one experience at a time</span>
            </h1>
            <p className="pl-hero-sub">
              Verified interview experiences, round breakdowns, salary insights, and preparation roadmaps — curated by
              seniors who have been there.
            </p>
            <div className="pl-hero-actions">
              <Link href="/placements/submit" className="pl-btn">
                ✍️ Share Interview Experience
              </Link>
              <Link href="/placements/roadmaps" className="pl-btn pl-btn-ghost">
                🗺️ Prep Roadmaps
              </Link>
            </div>
          </div>
          <div className="pl-hero-stats">
            <div className="pl-stat">
              <span className="pl-stat-value">40+</span>
              <span className="pl-stat-label">companies hiring</span>
            </div>
            <div className="pl-stat">
              <span className="pl-stat-value">100%</span>
              <span className="pl-stat-label">verified experiences</span>
            </div>
            <div className="pl-stat">
              <span className="pl-stat-value">4.5/5</span>
              <span className="pl-stat-label">avg prep rating</span>
            </div>
          </div>
        </header>

        <div className="pl-toolbar">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search company, role, or topics (e.g. Google, System Design)..."
              />
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <FilterPill active={jobTypeFilter === undefined} onClick={() => setJobTypeFilter(undefined)}>
                All Types
              </FilterPill>
              <FilterPill active={jobTypeFilter === 'FULL_TIME'} onClick={() => setJobTypeFilter('FULL_TIME')}>
                Full-Time
              </FilterPill>
              <FilterPill active={jobTypeFilter === 'INTERNSHIP'} onClick={() => setJobTypeFilter('INTERNSHIP')}>
                Internship
              </FilterPill>
            </div>
          </div>
        </div>

        {loading && <LoadingSkeleton count={3} />}
        {error && <ErrorState message={error} />}

        {!loading && !error && filtered.length === 0 && (
          <EmptyState
            title="No Placement Experiences Found"
            description="Try clearing your search filters or be the first senior to post an experience!"
          />
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="pl-grid">
            {filtered.map((exp) => (
              <PlacementCard key={exp.id} experience={exp} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function FilterPill({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pl-filter ${active ? 'pl-filter-active' : ''}`}
    >
      {children}
    </button>
  );
}