/**
 * Campus Connect — SearchBar & FilterSidebar Components
 */

import React from 'react';

export interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search courses, skills, or intents...' }: SearchBarProps) {
  return (
    <div className="relative w-full mb-4">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search Campus Connect"
        className="w-full min-h-[48px] px-4 pl-10 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <svg
        className="absolute left-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
  );
}

export interface FilterSidebarProps {
  selectedIntentType?: string;
  onSelectIntentType: (type?: string) => void;
}

export function FilterSidebar({ selectedIntentType, onSelectIntentType }: FilterSidebarProps) {
  const intentTypes = [
    { label: 'All Intents', value: undefined },
    { label: 'Study Partner', value: 'STUDY_PARTNER' },
    { label: 'Project Collaborator', value: 'PROJECT_COLLABORATOR' },
    { label: 'Mentorship', value: 'MENTORSHIP' },
    { label: 'Social Hangout', value: 'SOCIAL_HANG_OUT' }
  ];

  return (
    <aside className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
      <h3 className="font-semibold text-xs text-slate-400 uppercase tracking-wider mb-2">Intent Type</h3>
      <div className="space-y-1">
        {intentTypes.map((t) => {
          const isSelected = selectedIntentType === t.value;
          return (
            <button
              key={t.label}
              type="button"
              onClick={() => onSelectIntentType(t.value)}
              className={`w-full text-left min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                isSelected ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
