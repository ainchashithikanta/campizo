/**
 * Campus Connect — Study Group, Project, & Mentorship Cards
 */

import React from 'react';
import type { StudyGroupItem, ProjectTeamItem, MentorshipItem } from '../../lib/api-campus-connect';

export function StudyGroupCard({ group, onJoin }: { group: StudyGroupItem; onJoin?: (id: string) => void }) {
  return (
    <article className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            {group.courseCode}
          </span>
          <span className="text-xs text-slate-500">{group.currentMembers} / {group.maxCapacity} members</span>
        </div>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base mb-1">{group.title}</h3>
      </div>
      {onJoin && (
        <button
          type="button"
          onClick={() => onJoin(group.id)}
          className="mt-4 min-h-[44px] px-3 py-1.5 text-xs font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          Join Study Pod
        </button>
      )}
    </article>
  );
}

export function ProjectCard({ project, onJoin }: { project: ProjectTeamItem; onJoin?: (id: string) => void }) {
  return (
    <article className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
      <div>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          {project.status || 'OPEN'}
        </span>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base mt-2 mb-1">{project.title}</h3>
        {project.description && <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{project.description}</p>}
      </div>
      {onJoin && (
        <button
          type="button"
          onClick={() => onJoin(project.id)}
          className="mt-4 min-h-[44px] px-3 py-1.5 text-xs font-medium rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
        >
          Apply to Team
        </button>
      )}
    </article>
  );
}

export function MentorshipCard({ mentorship, onRequest }: { mentorship: Partial<MentorshipItem>; onRequest?: (mentorId: string) => void }) {
  return (
    <article className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">Mentor ID: {mentorship.mentorId || 'Mentor'}</h3>
        <p className="text-xs text-slate-500 mt-1">Status: {mentorship.status || 'AVAILABLE'}</p>
      </div>
      {onRequest && (
        <button
          type="button"
          onClick={() => onRequest(mentorship.mentorId || 'usr_mentor')}
          className="mt-4 min-h-[44px] px-3 py-1.5 text-xs font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          Request Mentorship
        </button>
      )}
    </article>
  );
}
