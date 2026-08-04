/**
 * Campus Connect — Intent Card Component
 * Card component displaying student academic intents (Study, Project, Mentorship, Social).
 */

import React from 'react';
import type { StudentIntent } from '../../lib/api-campus-connect';

export interface IntentCardProps {
  intent: StudentIntent;
  onFulfill?: (id: string) => void;
  onArchive?: (id: string) => void;
}

export function IntentCard({ intent, onFulfill, onArchive }: IntentCardProps) {
  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    PAUSED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    FULFILLED: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    ARCHIVED: 'bg-slate-500/10 text-slate-500'
  };

  return (
    <article className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {intent.intentType.replace('_', ' ')}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusColors[intent.status] || ''}`}>
            {intent.status}
          </span>
        </div>

        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base mb-1">{intent.title}</h3>

        {intent.courseCode && (
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2">{intent.courseCode}</p>
        )}

        {intent.description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{intent.description}</p>
        )}
      </div>

      {intent.status === 'ACTIVE' && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          {onFulfill && (
            <button
              type="button"
              onClick={() => onFulfill(intent.id)}
              className="min-h-[44px] px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            >
              Fulfill
            </button>
          )}
          {onArchive && (
            <button
              type="button"
              onClick={() => onArchive(intent.id)}
              className="min-h-[44px] px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
            >
              Archive
            </button>
          )}
        </div>
      )}
    </article>
  );
}
