/**
 * Campus Connect — Compatibility Badge & Reason List UI Components
 * Accessible WCAG 2.2 AA compliant UI badges displaying explainable compatibility metrics without exposing internal raw weights.
 */

import React from 'react';
import type { RecommendationReason } from '../../lib/api-campus-connect';

export interface CompatibilityBadgeProps {
  percentage: number;
}

export function CompatibilityBadge({ percentage }: CompatibilityBadgeProps) {
  const isHighMatch = percentage >= 85;
  const isMediumMatch = percentage >= 70 && percentage < 85;

  const colorClasses = isHighMatch
    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/20'
    : isMediumMatch
      ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400 dark:bg-indigo-500/20'
      : 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400 dark:bg-slate-500/20';

  return (
    <div
      tabIndex={0}
      role="status"
      aria-label={`${percentage}% compatibility match score`}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${colorClasses} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all`}
    >
      <span className="w-2 h-2 rounded-full bg-current animate-pulse" aria-hidden="true" />
      <span>{percentage}% Match</span>
    </div>
  );
}

export interface ReasonListProps {
  reasons: RecommendationReason[];
}

export function ReasonList({ reasons }: ReasonListProps) {
  if (!reasons || reasons.length === 0) return null;

  return (
    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300" aria-label="Compatibility Reasons">
      {reasons.map((r, i) => (
        <li key={i} className="flex items-center gap-2">
          <svg
            className="w-3.5 h-3.5 text-emerald-500 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span>{r.humanText}</span>
        </li>
      ))}
    </ul>
  );
}
