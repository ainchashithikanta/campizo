/**
 * Placement Guidance — Reusable UI Components
 * Accessible WCAG 2.2 AA compliant UI cards, badges, AI summary cards, and bookmarking controls.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import type {
  PlacementExperience,
  Company,
  SalaryInsight,
  InterviewRound,
  CompanyAISummary
} from '../../lib/api-placement-guidance';
import { saveBookmark, removeBookmark } from '../../lib/api-placement-guidance';

export function DifficultyBadge({ difficulty }: { difficulty: number }) {
  const labels: Record<number, { text: string; color: string }> = {
    1: { text: 'Very Easy', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    2: { text: 'Easy', color: 'bg-teal-500/10 text-teal-600 border-teal-500/20' },
    3: { text: 'Medium', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    4: { text: 'Hard', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
    5: { text: 'Very Hard', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' }
  };

  const current = labels[difficulty] || labels[3]!;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${current.color}`}
    >
      Difficulty: {current.text} ({difficulty}/5)
    </span>
  );
}

export function CompensationBadge({
  ctcLpa,
  stipendMonthly
}: {
  ctcLpa?: number | null;
  stipendMonthly?: number | null;
}) {
  if (ctcLpa) {
    return (
      <span className="px-3 py-1 rounded-xl font-mono font-bold text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        ₹{ctcLpa} LPA
      </span>
    );
  }
  if (stipendMonthly) {
    return (
      <span className="px-3 py-1 rounded-xl font-mono font-bold text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
        ₹{stipendMonthly.toLocaleString()}/mo Stipend
      </span>
    );
  }
  return null;
}

export function BookmarkButton({
  targetType,
  targetId,
  initialSaved = false
}: {
  targetType: 'COMPANY' | 'EXPERIENCE';
  targetId: string;
  initialSaved?: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);

  const toggleBookmark = async () => {
    const nextState = !saved;
    setSaved(nextState);
    try {
      if (nextState) {
        await saveBookmark(targetType, targetId);
      } else {
        await removeBookmark(targetType, targetId);
      }
    } catch {
      setSaved(!nextState);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleBookmark}
      aria-label={saved ? 'Remove bookmark' : 'Save bookmark'}
      className={`min-h-[44px] min-w-[44px] p-2 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-1 ${
        saved
          ? 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400'
          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
      }`}
    >
      <span>{saved ? '⭐ Saved' : '☆ Save'}</span>
    </button>
  );
}

export function CompanyAISummaryCard({ summary }: { summary: CompanyAISummary }) {
  return (
    <div className="p-5 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-indigo-500/5 dark:bg-slate-900 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">✨</span>
        <h3 className="font-bold text-sm text-indigo-900 dark:text-indigo-200">AI Preparation Summary & Topic Map</h3>
      </div>
      <p className="text-xs text-slate-700 dark:text-slate-300 mb-3">{summary.companySummary}</p>

      {summary.topTopics && summary.topTopics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {summary.topTopics.map((t, i) => (
            <span
              key={i}
              className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-600/10 text-indigo-700 dark:text-indigo-300"
            >
              #{t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function PlacementCard({ experience }: { experience: PlacementExperience }) {
  return (
    <article className="pl-card">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <Link href={`/placements/company/${experience.companySlug || 'google'}`} className="group">
              <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                {experience.companyName || 'Company'}
              </h3>
            </Link>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              {experience.roleTitle} • <span className="uppercase text-[11px] font-mono">{experience.jobType}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CompensationBadge ctcLpa={experience.ctcOfferedLpa} stipendMonthly={experience.stipendMonthly} />
            <BookmarkButton targetType="EXPERIENCE" targetId={experience.id} />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <DifficultyBadge difficulty={experience.difficultyRating} />
          <span className="text-xs text-slate-400">
            • {experience.branch} (CGPA: {experience.cgpa})
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 mb-4">{experience.summary}</p>
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">
          Posted by {experience.isAnonymous ? 'Anonymous Student' : 'Verified Senior'} (v{experience.versionNumber || 1}
          )
        </span>
        <Link
          href={`/placements/experience/${experience.id}`}
          className="pl-card-cta"
        >
          View Full Breakdown →
        </Link>
      </div>
    </article>
  );
}

export function CompanyHeader({ company, salaryInsights }: { company: Company; salaryInsights: SalaryInsight[] }) {
  const topInsight = salaryInsights[0];

  return (
    <section className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-white font-bold text-2xl border border-white/20">
            {company.name[0]}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{company.name}</h1>
              <BookmarkButton targetType="COMPANY" targetId={company.id} />
            </div>
            <p className="text-xs text-indigo-200 mt-0.5">
              {company.industry} • Tier: {company.tier}
            </p>

            {/* Company External Links */}
            <div className="flex gap-3 mt-2 text-[11px] font-semibold text-indigo-300">
              {company.careerUrl && (
                <a href={company.careerUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  🌐 Career Portal ↗
                </a>
              )}
              {company.glassdoorUrl && (
                <a href={company.glassdoorUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  📊 Glassdoor Reviews ↗
                </a>
              )}
            </div>
          </div>
        </div>

        {topInsight && (
          <div className="p-3.5 rounded-2xl bg-white/10 border border-white/20 text-right">
            <span className="text-[10px] uppercase font-mono tracking-wider text-indigo-200">Average Compensation</span>
            <p className="text-xl font-bold font-mono text-emerald-400">₹{topInsight.avgCtcLpa} LPA</p>
            <p className="text-[10px] text-slate-300">
              Min: ₹{topInsight.minCtcLpa}L | Max: ₹{topInsight.maxCtcLpa}L
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export function RoundAccordion({ round }: { round: InterviewRound }) {
  return (
    <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
            {round.roundNumber}
          </span>
          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{round.roundName}</h4>
        </div>
        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {round.roundType.replace('_', ' ')} • {round.durationMinutes} mins
        </span>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">{round.description}</p>

      {round.topicsCovered && round.topicsCovered.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {round.topicsCovered.map((t, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {round.questions && round.questions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Questions Asked:</p>
          <ul className="space-y-2">
            {round.questions.map((q) => (
              <li key={q.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{q.questionCategory}</span>
                  <span className="text-[10px] font-bold text-rose-500">{q.difficulty}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 italic">"{q.questionText}"</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
