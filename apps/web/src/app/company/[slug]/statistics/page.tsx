/**
 * Placement Knowledge Base — Company Database-Driven Statistics Page
 * Route: /company/[slug]/statistics
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { LoadingSkeleton, ErrorState } from '../../../../components/connect/state-components';
import { fetchCompanyStatistics, type CompanyStatistics } from '../../../../lib/api-placement-guidance';

export default function CompanyStatisticsPage() {
  const params = useParams();
  const slug = String(params?.slug || 'google');

  const [stats, setStats] = useState<CompanyStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanyStatistics(slug)
      .then((res) => {
        setStats(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || `Failed to load statistics for ${slug}`);
        setLoading(false);
      });
  }, [slug]);

  if (loading) return <main className="max-w-4xl mx-auto p-6"><LoadingSkeleton count={3} /></main>;
  if (error) return <main className="max-w-4xl mx-auto p-6"><ErrorState message={error} /></main>;
  if (!stats) return null;

  return (
    <main className="max-w-4xl mx-auto p-6 font-sans">
      <header className="mb-6">
        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">SQL Computed Metrics (No AI)</span>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 uppercase">{slug} Placement Analytics</h1>
        <p className="text-xs text-slate-500 mt-1">Aggregated statistics computed directly from candidate interview logs.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <span className="text-[10px] uppercase font-mono text-slate-400">Total Interviews</span>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{stats.interviewCount}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <span className="text-[10px] uppercase font-mono text-slate-400">Average Package</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">₹{stats.avgCtcLpa} LPA</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <span className="text-[10px] uppercase font-mono text-slate-400">Highest Package</span>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">₹{stats.highestCtcLpa} LPA</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <span className="text-[10px] uppercase font-mono text-slate-400">Avg Difficulty</span>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.avgDifficulty}/5</p>
        </div>
      </div>

      <section className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">Most Common Topics Asked</h2>
        <div className="flex flex-wrap gap-2">
          {stats.mostCommonTopics.map((topic, i) => (
            <span key={i} className="px-3 py-1 rounded-xl text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              #{topic}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
