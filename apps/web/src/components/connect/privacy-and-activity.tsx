/**
 * Campus Connect — Activity Timeline & Privacy Panel Components
 */

import React from 'react';
import type { ActivityEntry, PrivacySettings } from '../../lib/api-campus-connect';

export function ActivityTimeline({ activities }: { activities: ActivityEntry[] }) {
  if (!activities || activities.length === 0) {
    return <p className="text-xs text-slate-500 py-6 text-center">No recent activity logged.</p>;
  }

  return (
    <ol className="relative border-l border-slate-200 dark:border-slate-800 ml-3 space-y-6">
      {activities.map((act) => (
        <li key={act.activityId} className="ml-6">
          <span className="absolute flex items-center justify-center w-6 h-6 bg-indigo-100 dark:bg-indigo-900/50 rounded-full -left-3 ring-4 ring-white dark:ring-slate-900 text-indigo-600 text-xs">
            •
          </span>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {act.actionType.replace('_', ' ')}
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">{new Date(act.recordedAt).toLocaleString()}</p>
        </li>
      ))}
    </ol>
  );
}

export function PrivacyPanel({
  settings,
  onToggle
}: {
  settings: PrivacySettings;
  onToggle: (key: 'isGhostMode' | 'isIncognitoMode', value: boolean) => void;
}) {
  return (
    <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Ghost Mode</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Hide your student profile from all discovery feeds and recommendations.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.isGhostMode}
          onClick={() => onToggle('isGhostMode', !settings.isGhostMode)}
          className={`min-h-[44px] min-w-[50px] px-3 py-1 rounded-full text-xs font-bold transition-colors ${
            settings.isGhostMode
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          {settings.isGhostMode ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Incognito Mode</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Browse intent listings anonymously without recording profile view history.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.isIncognitoMode}
          onClick={() => onToggle('isIncognitoMode', !settings.isIncognitoMode)}
          className={`min-h-[44px] min-w-[50px] px-3 py-1 rounded-full text-xs font-bold transition-colors ${
            settings.isIncognitoMode
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          {settings.isIncognitoMode ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
}
