'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import '@web/styles/rate-my-professor.css';
import { ProfessorSearchHeader } from '@web/components/rate-my-professor/ProfessorSearchHeader';
import { ProfessorCard } from '@web/components/rate-my-professor/ProfessorCard';
import { Skeleton } from '@web/components/ui/Skeleton/Skeleton';
import { Button } from '@web/components/ui/Button/Button';
import { useProfessors, useDepartments, useDebounce } from '@web/hooks/use-api';
import type { SearchParams, ProfessorSummaryDto, DepartmentSummaryDto } from '@web/lib/types';

const FALLBACK_DEPARTMENTS: DepartmentSummaryDto[] = [
  {
    id: 'dept-cs-001',
    name: 'Computer Science & Engineering',
    shortName: 'CSE',
    professorCount: 24,
    averageBayesianRating: 4.72,
    totalReviews: 1240
  },
  {
    id: 'dept-ec-001',
    name: 'Electronics & Communication Engineering',
    shortName: 'ECE',
    professorCount: 18,
    averageBayesianRating: 4.58,
    totalReviews: 890
  },
  {
    id: 'dept-eee-001',
    name: 'Electrical & Electronics Engineering',
    shortName: 'EEE',
    professorCount: 15,
    averageBayesianRating: 4.45,
    totalReviews: 670
  },
  {
    id: 'dept-me-001',
    name: 'Mechanical Engineering',
    shortName: 'MECH',
    professorCount: 22,
    averageBayesianRating: 4.38,
    totalReviews: 1100
  },
  {
    id: 'dept-civil-001',
    name: 'Civil Engineering',
    shortName: 'CIVIL',
    professorCount: 16,
    averageBayesianRating: 4.52,
    totalReviews: 780
  },
  {
    id: 'dept-it-001',
    name: 'Information Technology',
    shortName: 'IT',
    professorCount: 12,
    averageBayesianRating: 4.61,
    totalReviews: 540
  }
];

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
  const [view, setView] = useState<'departments' | 'professors' | 'rankings'>('departments');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [params, setParams] = useState<SearchParams>({
    query: '',
    dept: '',
    minRating: undefined,
    sortBy: 'HIGHEST_RATED',
    page: 1,
    limit: 20
  });

  const debouncedQuery = useDebounce(params.query, 250);
  const queryParams: SearchParams = { ...params, query: debouncedQuery };

  const { data: deptData, loading: deptLoading, error: deptError, refetch: refetchDepts } = useDepartments();
  const { data: profData, loading: profLoading, error: profError, refetch: refetchProfs } = useProfessors(queryParams);

  const departmentsList = deptData || (deptError ? FALLBACK_DEPARTMENTS : FALLBACK_DEPARTMENTS);
  const professorsList = profData || (profError ? FALLBACK_PROFESSORS : FALLBACK_PROFESSORS);

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
      dept: selectedDept || '',
      minRating: undefined,
      sortBy: 'HIGHEST_RATED',
      page: 1,
      limit: 20
    });
  };

  const handleDeptSelect = (deptCode: string) => {
    setSelectedDept(deptCode);
    setParams((prev) => ({ ...prev, dept: deptCode, page: 1 }));
    setView('professors');
  };

  const handleBackToDepts = () => {
    setView('departments');
    setSelectedDept('');
    setParams((prev) => ({ ...prev, dept: '', page: 1 }));
  };

  const Tab = ({ name, label, count }: { name: 'departments' | 'professors' | 'rankings'; label: string; count?: number }) => (
    <button
      onClick={() => setView(name)}
      className={`rmp-tab ${view === name ? 'active' : ''}`}
      style={{
        padding: 'var(--ch-spacing-3) var(--ch-spacing-5)',
        border: 'none',
        background: view === name ? 'var(--ch-color-primary)' : 'transparent',
        color: view === name ? 'white' : 'var(--ch-color-text)',
        borderRadius: 'var(--ch-radius-md)',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--ch-spacing-2)',
        transition: 'all 0.2s ease'
      }}
    >
      {label}
      {count !== undefined && <span style={{ background: view === name ? 'rgba(255,255,255,0.2)' : 'var(--ch-color-surface-elevated)', padding: '2px 8px', borderRadius: '999px', fontSize: 'var(--ch-font-size-xs)' }}>{count}</span>}
    </button>
  );

  return (
    <div className="container rmp-section">
      <div style={{ marginBottom: 'var(--ch-spacing-6)' }}>
        <Link href="/" style={{ fontSize: 'var(--ch-font-size-sm)', color: 'var(--ch-color-text-muted)' }}>
          ← Back to Home
        </Link>
        <h1 style={{ fontSize: 'var(--ch-font-size-3xl)', fontWeight: 'bold', color: 'var(--ch-color-text)' }}>
          Professor Ratings
        </h1>
        <p style={{ color: 'var(--ch-color-text-muted)', fontSize: 'var(--ch-font-size-base)', marginTop: '4px' }}>
          Discover verified student reviews, Bayesian quality ratings, and academic dimension scores across campus
          University.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 'var(--ch-spacing-3)', marginBottom: 'var(--ch-spacing-6)', flexWrap: 'wrap' }}>
        <Tab name="departments" label="Departments" count={departmentsList.length} />
        <Tab name="rankings" label="Rankings" />
        {view === 'professors' && <Tab name="professors" label="Professors" count={filteredProfessors.length} />}
      </div>

      {view === 'departments' && (
        <>
          <div style={{ marginBottom: 'var(--ch-spacing-4)' }}>
            <input
              type="text"
              placeholder="Search departments..."
              onChange={(e) => setParams((prev) => ({ ...prev, query: e.target.value }))}
              value={params.query}
              style={{
                width: '100%',
                maxWidth: '400px',
                padding: 'var(--ch-spacing-3) var(--ch-spacing-4)',
                border: '1px solid var(--ch-color-border)',
                borderRadius: 'var(--ch-radius-md)',
                fontSize: 'var(--ch-font-size-base)',
                backgroundColor: 'var(--ch-color-surface)',
                color: 'var(--ch-color-text)'
              }}
            />
          </div>

          {deptLoading && !deptData ? (
            <div className="rmp-grid">
              <Skeleton variant="card" />
              <Skeleton variant="card" />
              <Skeleton variant="card" />
              <Skeleton variant="card" />
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </div>
          ) : deptError && !departmentsList.length ? (
            <div style={{ textAlign: 'center', padding: 'var(--ch-spacing-10)', backgroundColor: 'var(--ch-color-surface-elevated)', borderRadius: 'var(--ch-radius-lg)' }}>
              <h3 style={{ fontSize: 'var(--ch-font-size-lg)', fontWeight: 'bold', color: 'var(--ch-color-error)' }}>Failed to Load Departments</h3>
              <p style={{ color: 'var(--ch-color-text-muted)', marginBlock: 'var(--ch-spacing-3)' }}>{deptError}</p>
              <Button variant="outline" onClick={refetchDepts}>Try Again</Button>
            </div>
          ) : (
            <div className="rmp-grid rmp-stagger">
              {departmentsList.map((dept) => (
                <Link
                  key={dept.id}
                  href={`/professors/${dept.shortName}`}
                  onClick={(e) => { e.preventDefault(); handleDeptSelect(dept.shortName); }}
                  className="dept-card"
                  style={{
                    display: 'block',
                    textDecoration: 'none',
                    color: 'inherit',
                    background: 'var(--ch-color-surface-elevated)',
                    border: '1px solid var(--ch-color-border)',
                    borderRadius: 'var(--ch-radius-lg)',
                    padding: 'var(--ch-spacing-6)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: 'var(--ch-font-size-xs)', color: 'var(--ch-color-primary)', fontWeight: 600, marginBottom: 'var(--ch-spacing-2)' }}>
                    {dept.shortName}
                  </div>
                  <h3 style={{ fontSize: 'var(--ch-font-size-xl)', fontWeight: 'bold', color: 'var(--ch-color-text)', marginBottom: 'var(--ch-spacing-1)' }}>
                    {dept.name}
                  </h3>
                  <div style={{ display: 'flex', gap: 'var(--ch-spacing-6)', marginTop: 'var(--ch-spacing-4)', fontSize: 'var(--ch-font-size-sm)', color: 'var(--ch-color-text-muted)' }}>
                    <span><strong>{dept.professorCount}</strong> Professors</span>
                    <span>Avg Rating: <strong>{dept.averageBayesianRating.toFixed(2)}</strong></span>
                    <span><strong>{dept.totalReviews.toLocaleString()}</strong> Reviews</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {view === 'professors' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ch-spacing-3)', marginBottom: 'var(--ch-spacing-4)', flexWrap: 'wrap' }}>
            <Button variant="outline" onClick={handleBackToDepts} style={{ display: 'flex', alignItems: 'center', gap: 'var(--ch-spacing-2)' }}>
              ← Back to Departments
            </Button>
            <span style={{ color: 'var(--ch-color-text-muted)' }}>{selectedDept ? `Showing professors in ${selectedDept}` : 'All Departments'}</span>
          </div>

          <ProfessorSearchHeader
            params={params}
            onChange={handleParamChange}
            onReset={handleReset}
            totalResults={filteredProfessors.length}
          />

          {profLoading && !profData ? (
            <div className="rmp-grid">
              <Skeleton variant="card" />
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </div>
          ) : profError && !filteredProfessors.length ? (
            <div style={{ textAlign: 'center', padding: 'var(--ch-spacing-10)', backgroundColor: 'var(--ch-color-surface-elevated)', borderRadius: 'var(--ch-radius-lg)' }}>
              <h3 style={{ fontSize: 'var(--ch-font-size-lg)', fontWeight: 'bold', color: 'var(--ch-color-error)' }}>Failed to Load Professors</h3>
              <p style={{ color: 'var(--ch-color-text-muted)', marginBlock: 'var(--ch-spacing-3)' }}>{profError}</p>
              <Button variant="outline" onClick={refetchProfs}>Try Again</Button>
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
        </>
      )}

      {view === 'rankings' && (
        <div style={{ textAlign: 'center', padding: 'var(--ch-spacing-16)', backgroundColor: 'var(--ch-color-surface-elevated)', borderRadius: 'var(--ch-radius-lg)' }}>
          <div style={{ fontSize: '64px', marginBottom: 'var(--ch-spacing-4)' }}>🏆</div>
          <h2 style={{ fontSize: 'var(--ch-font-size-2xl)', fontWeight: 'bold', marginBottom: 'var(--ch-spacing-2)' }}>Rankings Dashboard</h2>
          <p style={{ color: 'var(--ch-color-text-muted)', marginBottom: 'var(--ch-spacing-6)', maxWidth: '500px', margin: '0 auto var(--ch-spacing-6)' }}>
            Top-rated professors, most reviewed, highest recommendations — coming soon.
          </p>
          <Button variant="primary" disabled>View Overall Rankings</Button>
        </div>
      )}
    </div>
  );
}