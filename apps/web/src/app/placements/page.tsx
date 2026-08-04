/**
 * Placement Guidance — Hub & Catalog Feed Page
 * Route: /placements
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
    const matchesSearch = !searchQuery || e.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) || e.roleTitle.toLowerCase().includes(searchQuery.toLowerCase()) || e.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesJobType = !jobTypeFilter || e.jobType === jobTypeFilter;
    return matchesSearch && matchesJobType;
  });

  return (
    <main className="max-w-6xl mx-auto p-6 font-sans">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">Placement Guidance & Interview Hub</h1>
          <p className="text-sm text-slate-500 mt-1">Verified interview experiences, round breakdowns, salary insights, and preparation tips.</p>
        </div>
        <Link
          href="/placements/submit"
          className="min-h-[48px] px-5 py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1"
        >
          + Share Interview Experience
        </Link>
      </header>

      <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
        <div className="flex-1 w-full">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search company, role, or question topics (e.g. Google, System Design)..." />
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setJobTypeFilter(undefined)}
            className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              jobTypeFilter === undefined ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            All Types
          </button>
          <button
            type="button"
            onClick={() => setJobTypeFilter('FULL_TIME')}
            className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              jobTypeFilter === 'FULL_TIME' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            Full-Time
          </button>
          <button
            type="button"
            onClick={() => setJobTypeFilter('INTERNSHIP')}
            className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              jobTypeFilter === 'INTERNSHIP' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            Internship
          </button>
        </div>
      </div>

      {loading && <LoadingSkeleton count={3} />}
      {error && <ErrorState message={error} />}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState title="No Placement Experiences Found" description="Try clearing your search filters or be the first senior to post an experience!" />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((exp) => (
            <PlacementCard key={exp.id} experience={exp} />
          ))}
        </div>
      )}
    </main>
  );
}
