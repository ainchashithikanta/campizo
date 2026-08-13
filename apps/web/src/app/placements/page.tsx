/**
 * Placement Guidance — Hub & Catalog Feed Page
 * Route: /placements
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import '@web/styles/rate-my-professor.css';
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
    <main className="rmp-section container mx-auto max-w-6xl px-6 font-sans">
      <header className="rmp-fade-in mb-8">
        <Link
          href="/"
          className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          ← Back to Home
        </Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-3">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">Placement Guidance Hub</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Verified interview experiences, round breakdowns, salary insights, and preparation roadmaps — curated by
              seniors.
            </p>
          </div>
          <Link
            href="/placements/submit"
            className="min-h-[48px] px-5 py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1"
          >
            + Share Interview Experience
          </Link>
        </div>
      </header>

      <div className="rmp-fade-in mb-6">
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
        <div className="rmp-grid rmp-stagger">
          {filtered.map((exp) => (
            <PlacementCard key={exp.id} experience={exp} />
          ))}
        </div>
      )}
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
      className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
        active
          ? 'bg-indigo-600 text-white'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  );
}
