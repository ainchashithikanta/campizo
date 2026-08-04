/**
 * Campus Connect — Recommendation Card Component
 * Accessible WCAG 2.2 AA card for explainable student match recommendations.
 */

import React from 'react';
import type { RecommendationItem } from '../../lib/api-campus-connect';
import { CompatibilityBadge, ReasonList } from './compatibility-badge';

export interface RecommendationCardProps {
  recommendation: RecommendationItem;
  onConnect?: (targetId: string) => void;
}

export function RecommendationCard({ recommendation, onConnect }: RecommendationCardProps) {
  return (
    <article
      className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
      aria-labelledby={`rec-name-${recommendation.snapshotId}`}
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 id={`rec-name-${recommendation.snapshotId}`} className="font-semibold text-base text-slate-900 dark:text-slate-10 font-sans">
              {recommendation.targetStudentName}
            </h3>
            {recommendation.major && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {recommendation.major} • Class of {recommendation.classYear || 2026}
              </p>
            )}
          </div>
          <CompatibilityBadge percentage={recommendation.compatibilityPct} />
        </div>

        <div className="my-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Why you match</p>
          <ReasonList reasons={recommendation.weightedReasons} />
        </div>
      </div>

      <div className="mt-4 pt-3 flex items-center justify-end border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => onConnect?.(recommendation.targetStudentId)}
          className="min-h-[48px] px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          aria-label={`Connect with ${recommendation.targetStudentName}`}
        >
          Connect
        </button>
      </div>
    </article>
  );
}
