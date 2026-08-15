'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import '@web/styles/rate-my-professor.css';
import { ProfessorSearchHeader } from '@web/components/rate-my-professor/ProfessorSearchHeader';
import { ProfessorCard } from '@web/components/rate-my-professor/ProfessorCard';
import { Skeleton } from '@web/components/ui/Skeleton/Skeleton';
import { Button } from '@web/components/ui/Button/Button';
import { useProfessors, useDebounce } from '@web/hooks/use-api';
import type { SearchParams, ProfessorSummaryDto } from '@web/lib/types';

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

export default function DepartmentProfessorsPage() {
  const params = useParams();
  const deptCode = params.deptCode as string;
  const [searchParams, setSearchParams] = useState<SearchParams>({
    query: '',
    dept: deptCode,
    minRating: undefined,
    sortBy: 'HIGHEST_RATED',
    page: 1,
    limit: 20
  });

  const debouncedQuery = useDebounce(searchParams.query, 250);
  const queryParams: SearchParams = { ...searchParams, query: debouncedQuery };

  const { data: apiData, loading, error, refetch } = useProfessors(queryParams);

  const professorsList = apiData || (error ? FALLBACK_PROFESSORS : FALLBACK_PROFESSORS);

  const filteredProfessors = professorsList.filter((p) => {
    if (p.departmentCode !== deptCode) return false;
    if (searchParams.minRating && p.bayesianRating < searchParams.minRating) return false;
    return true;
  });

  const handleParamChange = (newParams: Partial<SearchParams>) => {
    setSearchParams((prev) => ({ ...prev, ...newParams, page: 1, dept: deptCode }));
  };

  const handleReset = () => {
    setSearchParams({
      query: '',
      dept: deptCode,
      minRating: undefined,
      sortBy: 'HIGHEST_RATED',
      page: 1,
      limit: 20
    });
  };

  const deptNames: Record<string, string> = {
    'CSE': 'Computer Science & Engineering',
    'ECE': 'Electronics & Communication Engineering',
    'EEE': 'Electrical & Electronics Engineering',
    'MECH': 'Mechanical Engineering',
    'CIVIL': 'Civil Engineering',
    'IT': 'Information Technology',
    'MINING': 'Mining Engineering',
    'MACS': 'Mathematical & Computational Sciences',
    'PHYSICS': 'Physics',
    'CHEM': 'Chemistry',
    'CHENG': 'Chemical Engineering',
    'MME': 'Metallurgical & Materials Engineering',
    'HSS': 'Humanities, Social Sciences & Management',
    'WROE': 'Water Resources & Ocean Engineering'
  };

  const deptName = deptNames[deptCode] || deptCode;

  return (
    <div className="container rmp-section">
      <div style={{ marginBottom: 'var(--ch-spacing-6)' }}>
        <Link href="/professors" style={{ fontSize: 'var(--ch-font-size-sm)', color: 'var(--ch-color-text-muted)' }}>
          ← Back to Departments
        </Link>
        <h1 style={{ fontSize: 'var(--ch-font-size-3xl)', fontWeight: 'bold', color: 'var(--ch-color-text)' }}>
          {deptName} ({deptCode})
        </h1>
        <p style={{ color: 'var(--ch-color-text-muted)', fontSize: 'var(--ch-font-size-base)', marginTop: '4px' }}>
          Verified student reviews and Bayesian quality ratings for {deptName} faculty.
        </p>
      </div>

      <ProfessorSearchHeader
        params={searchParams}
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
        <div style={{ textAlign: 'center', padding: 'var(--ch-spacing-10)', backgroundColor: 'var(--ch-color-surface-elevated)', borderRadius: 'var(--ch-radius-lg)' }}>
          <h3 style={{ fontSize: 'var(--ch-font-size-lg)', fontWeight: 'bold', color: 'var(--ch-color-error)' }}>Failed to Load Professors</h3>
          <p style={{ color: 'var(--ch-color-text-muted)', marginBlock: 'var(--ch-spacing-3)' }}>{error}</p>
          <Button variant="outline" onClick={refetch}>Try Again</Button>
        </div>
      ) : filteredProfessors.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--ch-spacing-10)', backgroundColor: 'var(--ch-color-surface-elevated)', borderRadius: 'var(--ch-radius-lg)', border: '1px dashed var(--ch-color-border)' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
          <h3 style={{ fontSize: 'var(--ch-font-size-lg)', fontWeight: 'bold' }}>No Professors Found</h3>
          <p style={{ color: 'var(--ch-color-text-muted)', marginTop: '4px', marginBottom: '16px' }}>
            No professors matched your search filters. Try clearing your filters or searching for another keyword.
          </p>
          <Button variant="outline" onClick={handleReset}>Clear All Filters</Button>
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