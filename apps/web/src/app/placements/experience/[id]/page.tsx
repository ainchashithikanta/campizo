/**
 * Placement Guidance — Experience Breakdown Detail Page
 * Route: /placements/experience/[id]
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DifficultyBadge, CompensationBadge, RoundAccordion } from '../../../../components/placements/placement-components';
import { LoadingSkeleton, ErrorState } from '../../../../components/connect/state-components';
import { fetchExperienceById, markExperienceHelpful, reportExperience, type PlacementExperience } from '../../../../lib/api-placement-guidance';

export default function ExperienceDetailPage() {
  const params = useParams();
  const experienceId = String(params?.id || 'exp_default');

  const [experience, setExperience] = useState<PlacementExperience | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExperienceById(experienceId)
      .then((res) => {
        setExperience(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load placement experience details');
        setLoading(false);
      });
  }, [experienceId]);

  const handleHelpful = async () => {
    if (!experience) return;
    try {
      const updated = await markExperienceHelpful(experience.id);
      setExperience(updated);
    } catch {
      // Retain optimistic UI
    }
  };

  const handleReport = async () => {
    if (!experience) return;
    try {
      await reportExperience(experience.id, 'Inappropriate content');
      alert('Thank you. Experience reported for review.');
    } catch (err: any) {
      alert(err.message || 'Failed to report');
    }
  };

  if (loading) return <main className="max-w-4xl mx-auto p-6"><LoadingSkeleton count={3} /></main>;
  if (error) return <main className="max-w-4xl mx-auto p-6"><ErrorState message={error} /></main>;
  if (!experience) return null;

  return (
    <main className="max-w-4xl mx-auto p-6 font-sans">
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              {experience.companyName} • {experience.jobType}
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{experience.roleTitle}</h1>
            <p className="text-xs text-slate-500 mt-1">Branch: {experience.branch} (CGPA: {experience.cgpa})</p>
          </div>
          <CompensationBadge ctcLpa={experience.ctcOfferedLpa} stipendMonthly={experience.stipendMonthly} />
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <DifficultyBadge difficulty={experience.difficultyRating} />
          <span className="text-xs text-slate-500">Overall Satisfaction: {experience.overallRating}/5</span>
        </div>
      </div>

      <section className="mb-6 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">Executive Summary</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{experience.summary}</p>

        {experience.preparationTips && (
          <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
            <h3 className="font-bold mb-1">Preparation Tips from Candidate:</h3>
            <p>{experience.preparationTips}</p>
          </div>
        )}
      </section>

      {experience.rounds && experience.rounds.length > 0 && (
        <section className="mb-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">Interview Round Breakdown</h2>
          {experience.rounds.map((rnd) => (
            <RoundAccordion key={rnd.id} round={rnd} />
          ))}
        </section>
      )}

      <footer className="flex items-center justify-between p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/50">
        <button
          type="button"
          onClick={handleHelpful}
          className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
        >
          👍 Helpful ({experience.helpfulCount})
        </button>
        <button
          type="button"
          onClick={handleReport}
          className="min-h-[44px] px-3 py-2 text-xs font-semibold rounded-xl bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition-colors"
        >
          🚩 Report Issue
        </button>
      </footer>
    </main>
  );
}
