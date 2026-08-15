'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import '@web/styles/rate-my-professor.css';
import { ProfessorHero } from '@web/components/rate-my-professor/ProfessorHero';
import { RatingStatsCard } from '@web/components/rate-my-professor/RatingStatsCard';
import { ReviewCard } from '@web/components/rate-my-professor/ReviewCard';
import { WriteReviewModal } from '@web/components/rate-my-professor/WriteReviewModal';
import { ReportReviewModal } from '@web/components/rate-my-professor/ReportReviewModal';
import { FacultyResponseModal } from '@web/components/rate-my-professor/FacultyResponseModal';
import { ProfessorCard } from '@web/components/rate-my-professor/ProfessorCard';
import { Skeleton } from '@web/components/ui/Skeleton/Skeleton';
import { Button } from '@web/components/ui/Button/Button';
import { Badge } from '@web/components/ui/Badge/Badge';
import { useProfessorProfile, useProfessorStats, useProfessorReviews, useProfessors, useDebounce } from '@web/hooks/use-api';
import type { SearchParams, ProfessorSummaryDto, ProfessorProfileDto, ReviewDto } from '@web/lib/types';

const FALLBACK_PROFILE: ProfessorProfileDto = {
  id: 'prof-101',
  slug: 'dr-alan-turing',
  fullName: 'Dr. Alan Turing',
  designation: 'Professor & Department Chair',
  status: 'ACTIVE',
  department: { id: 'dept-cs-001', name: 'Computer Science & Engineering', code: 'CSE' },
  biography: 'Dr. Alan Turing is a pioneering computer scientist and mathematician...',
  photoUrl: null,
  coursesTaught: [
    { courseId: 'cs-101', code: 'CS101', name: 'Introduction to Computer Science' },
    { courseId: 'cs-301', code: 'CS301', name: 'Algorithms & Data Structures' }
  ],
  statistics: {
    bayesianRating: 4.85,
    rawAverageRating: 4.8,
    totalReviewsCount: 42,
    recommendationPercentage: 92.5,
    ratingConfidenceScore: 0.94,
    ratingDimensions: {
      teachingClarity: 4.7,
      gradingFairness: 4.6,
      punctuality: 4.8,
      approachability: 4.5
    },
    starDistribution: {
      star5: 32,
      star4: 8,
      star3: 2,
      star2: 0,
      star1: 0
    },
    lastCalculatedAt: new Date().toISOString()
  }
};

const FALLBACK_REVIEWS: ReviewDto[] = [
  {
    id: 'rev-001',
    professorId: 'prof-101',
    courseCode: 'CS101',
    courseName: 'Introduction to Computer Science',
    academicYear: '2024-25',
    semester: 'Fall',
    authorAnonymousToken: 'anon-001',
    isAnonymous: true,
    authorDisplayName: 'Anonymous Student',
    gradeReceived: 'A',
    reviewText: 'Dr. Turing is brilliant but demanding. The exams are tough but fair.',
    overallRating: 5,
    dimensions: { teachingClarity: 5, gradingFairness: 4, punctuality: 5, approachability: 4 },
    tags: ['Tough Grader', 'Clear Lectures'],
    helpfulCount: 15,
    unhelpfulCount: 2,
    userVote: null,
    facultyResponse: null,
    createdAt: new Date().toISOString(),
    isEditable: true
  },
  {
    id: 'rev-002',
    professorId: 'prof-101',
    courseCode: 'CS301',
    courseName: 'Algorithms & Data Structures',
    academicYear: '2024-25',
    semester: 'Spring',
    authorAnonymousToken: 'anon-002',
    isAnonymous: true,
    authorDisplayName: 'Anonymous Student',
    gradeReceived: 'A-',
    reviewText: 'Best professor I have ever had. Changed how I think about computing.',
    overallRating: 5,
    dimensions: { teachingClarity: 5, gradingFairness: 5, punctuality: 5, approachability: 5 },
    tags: ['Inspiring', 'Fair Exams'],
    helpfulCount: 22,
    unhelpfulCount: 1,
    userVote: null,
    facultyResponse: null,
    createdAt: new Date().toISOString(),
    isEditable: true
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
  }
];

export default function ProfessorProfilePage() {
  const params = useParams();
  const deptCode = params.deptCode as string;
  const slug = params.slug as string;

  const [reviewPage, setReviewPage] = useState(1);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ reviewId: string; reason?: string } | null>(null);
  const [responseTarget, setResponseTarget] = useState<{ reviewId: string; existingResponse?: string } | null>(null);

  const { data: profile, loading: profileLoading, error: profileError } = useProfessorProfile(slug);
  const { data: stats, loading: statsLoading } = useProfessorStats(slug);
  const { data: reviews, loading: reviewsLoading } = useProfessorReviews(slug, reviewPage);

  // Fetch other professors in same department for "More from this department" section
  const [relatedParams, setRelatedParams] = useState<SearchParams>({
    query: '',
    dept: deptCode,
    minRating: undefined,
    sortBy: 'HIGHEST_RATED',
    page: 1,
    limit: 4
  });
  const { data: relatedData } = useProfessors(relatedParams);
  const relatedProfessors = (relatedData || FALLBACK_PROFESSORS).filter((p) => p.slug !== slug).slice(0, 3);

  const content = profile || FALLBACK_PROFILE;
  const reviewList = reviews || FALLBACK_REVIEWS;
  const statistics = stats || content.statistics;

  if (profileLoading || statsLoading) {
    return (
      <div className="container rmp-section">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--ch-spacing-6)' }}>
          <div style={{ gridColumn: '1 / -1' }}><Skeleton variant="card" /></div>
          <Skeleton variant="card" />
        </div>
      </div>
    );
  }

  if (profileError && !profile) {
    return (
      <div className="container rmp-section" style={{ textAlign: 'center', padding: 'var(--ch-spacing-16)' }}>
        <h2 style={{ color: 'var(--ch-color-error)' }}>Professor Not Found</h2>
        <Link href="/professors" style={{ display: 'inline-block', marginTop: 'var(--ch-spacing-4)' }}>
          <Button variant="primary">← Back to Professors</Button>
        </Link>
      </div>
    );
  }

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

  const deptName = deptNames[deptCode] || content.department.name;

  return (
    <div className="container rmp-section">
      <div style={{ marginBottom: 'var(--ch-spacing-6)' }}>
        <Link href={`/professors/${deptCode}`} style={{ fontSize: 'var(--ch-font-size-sm)', color: 'var(--ch-color-text-muted)' }}>
          ← Back to {deptName} Professors
        </Link>
      </div>

      <ProfessorHero profile={content} onRateClick={() => setShowWriteReview(true)} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--ch-spacing-6)' }}>
        <div>
          <section style={{ marginBottom: 'var(--ch-spacing-8)' }}>
            <h2 style={{ fontSize: 'var(--ch-font-size-xl)', fontWeight: 'bold', marginBottom: 'var(--ch-spacing-4)' }}>
              Student Reviews ({content.statistics.totalReviewsCount})
            </h2>
            {reviewList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--ch-spacing-10)', backgroundColor: 'var(--ch-color-surface-elevated)', borderRadius: 'var(--ch-radius-lg)' }}>
                <p style={{ color: 'var(--ch-color-text-muted)', marginBottom: 'var(--ch-spacing-4)' }}>No reviews yet. Be the first to review!</p>
                <Button variant="primary" onClick={() => setShowWriteReview(true)}>Write a Review</Button>
              </div>
            ) : (
              <>
                {reviewList.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onVote={async () => {}}
                    onReport={(r) => setReportTarget({ reviewId: r.id })}
                    onFacultyRespond={(r) => setResponseTarget({ reviewId: r.id })}
                  />
                ))}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--ch-spacing-2)', marginTop: 'var(--ch-spacing-6)' }}>
                  <Button variant="outline" onClick={() => setReviewPage((p) => Math.max(1, p - 1))} disabled={reviewPage <= 1}>
                    Previous
                  </Button>
                  <span style={{ display: 'flex', alignItems: 'center', padding: '0 var(--ch-spacing-4)', color: 'var(--ch-color-text-muted)' }}>
                    Page {reviewPage}
                  </span>
                  <Button variant="outline" onClick={() => setReviewPage((p) => p + 1)} disabled={reviewList.length < 20}>
                    Next
                  </Button>
                </div>
              </>
            )}
            <div style={{ marginTop: 'var(--ch-spacing-6)', textAlign: 'center' }}>
              <Button variant="primary" onClick={() => setShowWriteReview(true)}>Write a Review</Button>
            </div>
          </section>

          {relatedProfessors.length > 0 && (
            <section>
              <h2 style={{ fontSize: 'var(--ch-font-size-xl)', fontWeight: 'bold', marginBottom: 'var(--ch-spacing-4)' }}>
                More from {deptName}
              </h2>
              <div className="rmp-grid">
                {relatedProfessors.map((prof) => (
                  <ProfessorCard key={prof.id} professor={prof} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside>
          <RatingStatsCard stats={statistics} />
          <div style={{ marginTop: 'var(--ch-spacing-6)', padding: 'var(--ch-spacing-4)', backgroundColor: 'var(--ch-color-surface-elevated)', borderRadius: 'var(--ch-radius-lg)', border: '1px solid var(--ch-color-border)' }}>
            <h3 style={{ fontSize: 'var(--ch-font-size-base)', fontWeight: 'bold', marginBottom: 'var(--ch-spacing-3)' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ch-spacing-2)' }}>
              <Button variant="primary" onClick={() => setShowWriteReview(true)} style={{ width: '100%' }}>
                Write a Review
              </Button>
              <Button variant="outline" onClick={() => window.open(`/professors/${deptCode}`, '_self')} style={{ width: '100%' }}>
                View All {deptNames[deptCode]} Professors
              </Button>
            </div>
          </div>
        </aside>
      </div>

      <WriteReviewModal
        isOpen={showWriteReview}
        onClose={() => setShowWriteReview(false)}
        profile={content}
        onSubmit={async (data) => { setShowWriteReview(false); setReviewPage(1); }}
      />

      <ReportReviewModal
        isOpen={!!reportTarget}
        onClose={() => setReportTarget(null)}
        review={reportTarget ? reviewList.find(r => r.id === reportTarget.reviewId) || null : null}
        onSubmit={async (reviewId, data) => { setReportTarget(null); }}
      />

      <FacultyResponseModal
        isOpen={!!responseTarget}
        onClose={() => setResponseTarget(null)}
        review={responseTarget ? reviewList.find(r => r.id === responseTarget.reviewId) || null : null}
        onSubmit={async (reviewId, data) => { setResponseTarget(null); }}
      />
    </div>
  );
}