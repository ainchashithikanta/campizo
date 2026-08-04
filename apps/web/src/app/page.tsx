'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ProfessorSearchHeader } from '@web/components/rate-my-professor/ProfessorSearchHeader';
import { ProfessorCard } from '@web/components/rate-my-professor/ProfessorCard';
import { Skeleton } from '@web/components/ui/Skeleton/Skeleton';
import { Button } from '@web/components/ui/Button/Button';
import { useProfessors, useDebounce } from '@web/hooks/use-api';
import type { SearchParams, ProfessorSummaryDto } from '@web/lib/types';

// Fallback initial data for instant initial render or offline state
const FALLBACK_PROFESSORS: ProfessorSummaryDto[] = [
  {
    id: 'prof-101',
    slug: 'dr-alan-turing',
    fullName: 'Dr. Alan Turing',
    designation: 'Professor & Department Chair',
    departmentName: 'Computer Science & Engineering',
    departmentCode: 'CSE',
    photoUrl: null,
    bayesianRating: 4.85,
    totalReviewsCount: 42,
    recommendationPercentage: 92.5,
    topTags: ['Theoretical Pioneer', 'Tough Grader', 'Pop Quizzes']
  },
  {
    id: 'prof-102',
    slug: 'dr-ada-lovelace',
    fullName: 'Dr. Ada Lovelace',
    designation: 'Associate Professor',
    departmentName: 'Computer Science & Engineering',
    departmentCode: 'CSE',
    photoUrl: null,
    bayesianRating: 4.92,
    totalReviewsCount: 58,
    recommendationPercentage: 96.0,
    topTags: ['Algorithm Genius', 'Clear Lectures', 'Accessible']
  },
  {
    id: 'prof-103',
    slug: 'dr-richard-feynman',
    fullName: 'Dr. Richard Feynman',
    designation: 'Distinguished Professor',
    departmentName: 'Applied Physics',
    departmentCode: 'PHYS',
    photoUrl: null,
    bayesianRating: 4.78,
    totalReviewsCount: 89,
    recommendationPercentage: 91.0,
    topTags: ['Engaging Demonstrations', 'Inspiring', 'Fair Exams']
  }
];

export default function ProfessorDirectoryPage() {
  const [params, setParams] = useState<SearchParams>({
    query: '',
    dept: '',
    minRating: undefined,
    sortBy: 'HIGHEST_RATED',
    page: 1,
    limit: 20
  });

  const debouncedQuery = useDebounce(params.query, 250);

  const queryParams: SearchParams = {
    ...params,
    query: debouncedQuery
  };

  const { data: apiData, loading, error, refetch } = useProfessors(queryParams);

  const professorsList = apiData || (error ? FALLBACK_PROFESSORS : (apiData ?? FALLBACK_PROFESSORS));

  const filteredProfessors = professorsList.filter((p) => {
    if (params.dept && p.departmentCode !== params.dept) return false;
    if (params.minRating && p.bayesianRating < params.minRating) return false;
    return true;
  });

  const handleParamChange = (newParams: Partial<SearchParams>) => {
    setParams((prev) => ({ ...prev, ...newParams, page: 1 }));
  };

  const handleReset = () => {
    setParams({
      query: '',
      dept: '',
      minRating: undefined,
      sortBy: 'HIGHEST_RATED',
      page: 1,
      limit: 20
    });
  };

  return (
    <div className="container rmp-section">
      {/* Enterprise Platform Operations Console Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A, #1E293B)',
          border: '1px solid #334155',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-block',
              background: 'rgba(99, 102, 241, 0.2)',
              color: '#818CF8',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 8px',
              borderRadius: '6px',
              textTransform: 'uppercase',
              marginBottom: '8px'
            }}
          >
            ENTERPRISE PLATFORM SYSTEM
          </div>
          <h2 style={{ color: '#F8FAFC', fontSize: '20px', fontWeight: 700, margin: 0 }}>
            ⚡ Platform Feature Management Operations Console
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '14px', marginTop: '4px', margin: 0 }}>
            Real-time operational visibility, canary rollouts, dependency graph visualization, 4-eye approvals, and
            emergency kill switches.
          </p>
        </div>

        <Link
          href="/admin/feature-flags"
          style={{
            background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '14px',
            padding: '12px 24px',
            borderRadius: '10px',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
          }}
        >
          Open Operations Console ➔
        </Link>
      </div>

      <div style={{ marginBottom: 'var(--ch-spacing-6)' }}>
        <h1 style={{ fontSize: 'var(--ch-font-size-3xl)', fontWeight: 'bold', color: 'var(--ch-color-text)' }}>
          Academic Evaluations & Professor Directory
        </h1>
        <p style={{ color: 'var(--ch-color-text-muted)', fontSize: 'var(--ch-font-size-base)', marginTop: '4px' }}>
          Discover verified student reviews, Bayesian quality ratings, and academic dimension scores across Stanford
          University.
        </p>
      </div>

      <ProfessorSearchHeader
        params={params}
        onChange={handleParamChange}
        onReset={handleReset}
        totalResults={filteredProfessors.length}
      />

      {loading && !apiData ? (
        <div className="rmp-grid">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      ) : error && !filteredProfessors.length ? (
        <div
          style={{
            textAlign: 'center',
            padding: 'var(--ch-spacing-10)',
            backgroundColor: 'var(--ch-color-surface-elevated)',
            borderRadius: 'var(--ch-radius-lg)'
          }}
        >
          <h3 style={{ fontSize: 'var(--ch-font-size-lg)', fontWeight: 'bold', color: 'var(--ch-color-error)' }}>
            Failed to Load Directory
          </h3>
          <p style={{ color: 'var(--ch-color-text-muted)', marginBlock: 'var(--ch-spacing-3)' }}>{error}</p>
          <Button variant="outline" onClick={refetch}>
            Try Again
          </Button>
        </div>
      ) : filteredProfessors.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 'var(--ch-spacing-10)',
            backgroundColor: 'var(--ch-color-surface-elevated)',
            borderRadius: 'var(--ch-radius-lg)',
            border: '1px dashed var(--ch-color-border)'
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
          <h3 style={{ fontSize: 'var(--ch-font-size-lg)', fontWeight: 'bold' }}>No Professors Found</h3>
          <p style={{ color: 'var(--ch-color-text-muted)', marginTop: '4px', marginBottom: '16px' }}>
            No professors matched your search filters. Try clearing your filters or searching for another keyword.
          </p>
          <Button variant="outline" onClick={handleReset}>
            Clear All Filters
          </Button>
        </div>
      ) : (
        <div className="rmp-grid rmp-stagger">
          {filteredProfessors.map((prof) => (
            <ProfessorCard key={prof.id} professor={prof} />
          ))}
        </div>
      )}
    </div>
  );
}
