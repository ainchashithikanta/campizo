/**
 * Placement Knowledge Base — Admin Preparation Roadmaps Page
 * Route: /placements/roadmaps
 */

'use client';

import React, { useState, useEffect } from 'react';
import { LoadingSkeleton, ErrorState } from '../../../components/connect/state-components';
import { fetchAdminRoadmaps, type AdminRoadmap } from '../../../lib/api-placement-guidance';

export default function RoadmapsPage() {
  const [roadmaps, setRoadmaps] = useState<AdminRoadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminRoadmaps()
      .then((res) => {
        setRoadmaps(res || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load preparation roadmaps');
        setLoading(false);
      });
  }, []);

  if (loading) return <main className="max-w-4xl mx-auto p-6"><LoadingSkeleton count={3} /></main>;
  if (error) return <main className="max-w-4xl mx-auto p-6"><ErrorState message={error} /></main>;

  const currentRoadmap = roadmaps[0];

  return (
    <main className="max-w-4xl mx-auto p-6 font-sans">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">Preparation Roadmaps</h1>
        <p className="text-sm text-slate-500 mt-1">Structured learning sequence curated by campus placement cell and senior engineering alumni.</p>
      </header>

      {currentRoadmap && (
        <section className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="mb-6">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Master Roadmap</span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{currentRoadmap.title}</h2>
            <p className="text-xs text-slate-500 mt-1">{currentRoadmap.description}</p>
          </div>

          <div className="space-y-4 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-indigo-500/20">
            {currentRoadmap.steps.map((step) => (
              <div key={step.order} className="relative pl-10">
                <span className="absolute left-1 top-1 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                  {step.order}
                </span>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{step.topic}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      {step.recommendedProblemsCount} Recommended Problems
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
