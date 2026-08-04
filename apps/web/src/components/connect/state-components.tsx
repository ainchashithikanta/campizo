/**
 * Campus Connect — Shared UI State Components (EmptyState, LoadingSkeleton, ErrorState, Pagination)
 */

import React from 'react';

export function EmptyState({
  title = 'No Items Found',
  description = 'There are no items available right now.'
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 my-4">
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mx-auto">{description}</p>
    </div>
  );
}

export function LoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 animate-pulse h-44"
        />
      ))}
    </div>
  );
}

export function ErrorState({ message = 'An error occurred loading content.' }: { message?: string }) {
  return (
    <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm my-4">
      <p className="font-semibold mb-1">Error Loading Campus Connect Data</p>
      <p className="text-xs">{message}</p>
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  onPageChange
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="min-h-[44px] px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-40 transition-colors"
      >
        Previous
      </button>
      <span className="text-xs text-slate-500">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="min-h-[44px] px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-40 transition-colors"
      >
        Next
      </button>
    </div>
  );
}
