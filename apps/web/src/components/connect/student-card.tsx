/**
 * Campus Connect — Student Card & Profile Hero Components
 * Academic-first student profile display UI components. NEVER exposes TrustScore or moderation internals.
 */

import React from 'react';
import type { StudentProfile } from '../../lib/api-campus-connect';

export interface StudentCardProps {
  student: Partial<StudentProfile>;
  onAction?: () => void;
  actionLabel?: string;
}

export function StudentCard({ student, onAction, actionLabel = 'Connect' }: StudentCardProps) {
  return (
    <article className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold text-lg">
            {student.fullName?.[0] || 'S'}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">{student.fullName || 'Student'}</h3>
            <p className="text-xs text-slate-500">{student.major || 'Computer Science'} • {student.classYear || 2026}</p>
          </div>
        </div>

        {student.bio && <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{student.bio}</p>}

        {student.courses && student.courses.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {student.courses.map((c, i) => (
              <span key={i} className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 w-full min-h-[48px] py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </article>
  );
}

export interface ProfileHeroProps {
  profile: StudentProfile;
}

export function ProfileHero({ profile }: ProfileHeroProps) {
  return (
    <section className="p-6 rounded-3xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white shadow-md mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-white/10 text-white flex items-center justify-center font-bold text-3xl border-2 border-white/20">
          {profile.fullName?.[0] || 'S'}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{profile.fullName}</h1>
          <p className="text-sm text-indigo-200 mt-1">{profile.major} • Class of {profile.classYear}</p>
          {profile.bio && <p className="text-xs text-slate-300 mt-2 max-w-xl">{profile.bio}</p>}
        </div>
      </div>
    </section>
  );
}
