'use client';

import React from 'react';
import styles from './ProfessorSearchHeader.module.css';
import { Input } from '@web/components/ui/Input/Input';
import { Select } from '@web/components/ui/Select/Select';
import { Button } from '@web/components/ui/Button/Button';
import type { SearchParams } from '@web/lib/types';

export interface ProfessorSearchHeaderProps {
  params: SearchParams;
  onChange: (newParams: Partial<SearchParams>) => void;
  onReset: () => void;
  totalResults?: number;
}

const DEPARTMENTS = [
  { value: 'CSE', label: 'Computer Science & Eng (CSE)' },
  { value: 'ECE', label: 'Electronics & Comm (ECE)' },
  { value: 'ME', label: 'Mechanical Eng (ME)' },
  { value: 'EE', label: 'Electrical Eng (EE)' },
  { value: 'MATH', label: 'Mathematics & Computing' },
  { value: 'PHYS', label: 'Applied Physics' },
];

const RATINGS = [
  { value: '4.5', label: '★ 4.5 & Above (Excellent)' },
  { value: '4.0', label: '★ 4.0 & Above (Good)' },
  { value: '3.0', label: '★ 3.0 & Above (Average)' },
];

const SORT_OPTIONS = [
  { value: 'MOST_HELPFUL', label: 'Most Helpful' },
  { value: 'RECENT', label: 'Recently Reviewed' },
  { value: 'HIGHEST_RATED', label: 'Highest Bayesian Rating' },
  { value: 'LOWEST_RATED', label: 'Lowest Bayesian Rating' },
];

export function ProfessorSearchHeader({ params, onChange, onReset, totalResults }: ProfessorSearchHeaderProps) {
  const hasActiveFilters = Boolean(params.query || params.dept || params.minRating || params.sortBy);

  return (
    <div className={styles.container}>
      <div className={styles.filtersGrid}>
        <Input
          label="Search Professor or Subject Code"
          placeholder="e.g. Alan Turing, CS101..."
          value={params.query || ''}
          onChange={(e) => onChange({ query: e.target.value })}
          iconLeft={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          }
          iconRight={
            params.query ? (
              <button
                type="button"
                onClick={() => onChange({ query: '' })}
                aria-label="Clear search"
                style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'inherit' }}
              >
                ✕
              </button>
            ) : undefined
          }
        />

        <Select
          label="Department"
          placeholder="All Departments"
          options={DEPARTMENTS}
          value={params.dept || ''}
          onChange={(e) => onChange({ dept: e.target.value })}
        />

        <Select
          label="Minimum Rating"
          placeholder="Any Rating"
          options={RATINGS}
          value={params.minRating ? String(params.minRating) : ''}
          onChange={(e) => onChange({ minRating: e.target.value ? Number(e.target.value) : undefined })}
        />

        <Select
          label="Sort By"
          options={SORT_OPTIONS}
          value={params.sortBy || 'HIGHEST_RATED'}
          onChange={(e) => onChange({ sortBy: e.target.value as SearchParams['sortBy'] })}
        />

        {hasActiveFilters && (
          <Button variant="outline" size="md" onClick={onReset}>
            Reset Filters
          </Button>
        )}
      </div>

      {totalResults !== undefined && (
        <div className={styles.resultsCount}>
          Showing {totalResults} verified professor{totalResults === 1 ? '' : 's'}
        </div>
      )}
    </div>
  );
}
