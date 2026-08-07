'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import '@web/styles/rate-my-professor.css';
import { ProfessorHero } from '@web/components/rate-my-professor/ProfessorHero';
import { RatingStatsCard } from '@web/components/rate-my-professor/RatingStatsCard';
import { ReviewCard } from '@web/components/rate-my-professor/ReviewCard';
import { ProfessorCard } from '@web/components/rate-my-professor/ProfessorCard';
import { WriteReviewModal } from '@web/components/rate-my-professor/WriteReviewModal';
import { ReportReviewModal } from '@web/components/rate-my-professor/ReportReviewModal';
import { FacultyResponseModal } from '@web/components/rate-my-professor/FacultyResponseModal';
import { Skeleton } from '@web/components/ui/Skeleton/Skeleton';
import { Button } from '@web/components/ui/Button/Button';
import { Badge } from '@web/components/ui/Badge/Badge';
import { useProfessorProfile, useProfessorStats, useProfessorReviews } from '@web/hooks/use-api';
import * as api from '@web/lib/api';
import type {
  ReviewDto,
  ReviewCreateRequest,
  ReportRequest,
  FacultyResponseRequest,
  ProfessorProfileDto,
  ProfessorStatisticsDto
} from '@web/lib/types';

// Fallback profile for Dr. Alan Turing
const FALLBACK_PROFILE: ProfessorProfileDto = {
  id: 'prof-101',
  slug: 'dr-alan-turing',
  fullName: 'Dr. Alan Turing',
  designation: 'Professor & Department Chair',
  status: 'ACTIVE',
  department: {
    id: 'dept-cs-001',
    name: 'Computer Science & Engineering',
    code: 'CSE'
  },
  biography:
    'Pioneer of theoretical computer science and artificial intelligence. Taught algorithms and cryptography for over 15 years.',
  photoUrl: null,
  coursesTaught: [
    { courseId: 'c-1', code: 'CS101', name: 'Introduction to Computer Science' },
    { courseId: 'c-2', code: 'CS201', name: 'Data Structures & Algorithms' },
    { courseId: 'c-3', code: 'CS401', name: 'Theory of Computation' }
  ],
  statistics: {
    bayesianRating: 4.85,
    rawAverageRating: 4.9,
    totalReviewsCount: 42,
    recommendationPercentage: 92.5,
    ratingConfidenceScore: 0.95,
    ratingDimensions: {
      teachingClarity: 4.8,
      gradingFairness: 4.7,
      punctuality: 4.9,
      approachability: 4.8
    },
    starDistribution: {
      star5: 35,
      star4: 5,
      star3: 2,
      star2: 0,
      star1: 0
    },
    lastCalculatedAt: new Date().toISOString()
  }
};

const FALLBACK_STATS: ProfessorStatisticsDto = FALLBACK_PROFILE.statistics;

const FALLBACK_REVIEWS: ReviewDto[] = [
  {
    id: 'rev-101',
    professorId: 'prof-101',
    courseCode: 'CS201',
    courseName: 'Data Structures & Algorithms',
    academicYear: '2024-25',
    semester: '5th Sem',
    authorAnonymousToken: 'anon-abc12345',
    isAnonymous: true,
    authorDisplayName: null,
    gradeReceived: 'A+',
    reviewText:
      'Dr. Turing is easily one of the best professors on campus. His lectures on Turing machines and algorithm complexity are legendary. Viva questions are tough, but if you study his PPTs, you will get an A+!',
    overallRating: 5.0,
    dimensions: {
      teachingClarity: 5.0,
      gradingFairness: 4.5,
      punctuality: 5.0,
      approachability: 4.8
    },
    tags: ['Legendary Lectures', 'Tough Viva', 'Fair Grading'],
    helpfulCount: 24,
    unhelpfulCount: 1,
    userVote: 'HELPFUL',
    facultyResponse: {
      id: 'resp-1',
      responseText:
        'Thank you for the thoughtful feedback! I aim to make complexity theory intuitive for all students.',
      respondedAt: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    isEditable: false
  },
  {
    id: 'rev-102',
    professorId: 'prof-101',
    courseCode: 'CS101',
    courseName: 'Introduction to Computer Science',
    academicYear: '2024-25',
    semester: '1st Sem',
    authorAnonymousToken: 'anon-xyz98765',
    isAnonymous: false,
    authorDisplayName: 'Rohan Sharma',
    gradeReceived: 'A',
    reviewText:
      'Great introduction to programming! Assignments are challenging but very rewarding. Make sure to attend all lab sessions.',
    overallRating: 4.8,
    dimensions: {
      teachingClarity: 4.8,
      gradingFairness: 4.8,
      punctuality: 4.9,
      approachability: 4.7
    },
    tags: ['Lab Focused', 'Pop Quizzes'],
    helpfulCount: 12,
    unhelpfulCount: 0,
    userVote: null,
    facultyResponse: null,
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    isEditable: true
  }
];

export default function ProfessorProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const { data: apiProfile, loading: profileLoading } = useProfessorProfile(slug);
  const { data: apiStats } = useProfessorStats(slug);
  const { data: apiReviews, refetch: refetchReviews } = useProfessorReviews(slug);

  const profile = apiProfile || FALLBACK_PROFILE;
  const stats = apiStats || profile.statistics || FALLBACK_STATS;
  const reviewsList = apiReviews || FALLBACK_REVIEWS;

  const [writeModalOpen, setWriteModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [facultyModalOpen, setFacultyModalOpen] = useState(false);
  const [selectedReviewForReport, setSelectedReviewForReport] = useState<ReviewDto | null>(null);
  const [selectedReviewForFaculty, setSelectedReviewForFaculty] = useState<ReviewDto | null>(null);
  const [reviewSort, setReviewSort] = useState<'MOST_HELPFUL' | 'RECENT'>('MOST_HELPFUL');

  const sortedReviews = [...reviewsList].sort((a, b) => {
    if (reviewSort === 'MOST_HELPFUL') {
      return b.helpfulCount - a.helpfulCount;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleVote = async (reviewId: string, type: 'HELPFUL' | 'UNHELPFUL') => {
    try {
      await api.voteOnReview(slug, reviewId, { voteType: type });
    } catch {
      // Fallback
    }
  };

  const handleWriteSubmit = async (data: ReviewCreateRequest) => {
    await api.submitReview(slug, data);
    refetchReviews();
  };

  const handleReportSubmit = async (reviewId: string, data: ReportRequest) => {
    await api.reportReview(slug, reviewId, data);
  };

  const handleFacultySubmit = async (reviewId: string, data: FacultyResponseRequest) => {
    await api.addFacultyResponse(slug, reviewId, data);
    refetchReviews();
  };

  if (profileLoading && !apiProfile) {
    return (
      <div className="container rmp-section">
        <Skeleton variant="card" height={200} className="mb-4" />
        <Skeleton variant="card" height={300} />
      </div>
    );
  }

  return (
    <div className="container rmp-section">
      <div style={{ marginBottom: 'var(--ch-spacing-4)' }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: 'var(--ch-font-size-sm)',
            color: 'var(--ch-color-primary)',
            fontWeight: 'var(--ch-font-weight-medium)'
          }}
        >
          ← Back to Directory
        </Link>
      </div>

      <ProfessorHero profile={profile} onRateClick={() => setWriteModalOpen(true)} />

      <RatingStatsCard stats={stats} />

      {profile.coursesTaught && profile.coursesTaught.length > 0 && (
        <div
          style={{
            backgroundColor: 'var(--ch-color-surface-elevated)',
            border: '1px solid var(--ch-color-border)',
            borderRadius: 'var(--ch-radius-lg)',
            padding: 'var(--ch-spacing-5)',
            marginBottom: 'var(--ch-spacing-6)'
          }}
        >
          <h3
            style={{
              fontSize: 'var(--ch-font-size-sm)',
              fontWeight: 'var(--ch-font-weight-semibold)',
              color: 'var(--ch-color-text-muted)',
              marginBottom: 'var(--ch-spacing-3)',
              textTransform: 'uppercase'
            }}
          >
            Courses Taught
          </h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {profile.coursesTaught.map((c) => (
              <Badge key={c.courseId} variant="primary">
                {c.code} — {c.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="rmp-profile-layout">
        <div className="rmp-profile-main">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--ch-spacing-4)',
              flexWrap: 'wrap',
              gap: 'var(--ch-spacing-3)'
            }}
          >
            <h2 style={{ fontSize: 'var(--ch-font-size-xl)', fontWeight: 'bold' }}>
              Verified Student Reviews ({reviewsList.length})
            </h2>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant={reviewSort === 'MOST_HELPFUL' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setReviewSort('MOST_HELPFUL')}
              >
                Most Helpful
              </Button>
              <Button
                variant={reviewSort === 'RECENT' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setReviewSort('RECENT')}
              >
                Recent
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ch-spacing-4)' }}>
            {sortedReviews.map((rev) => (
              <ReviewCard
                key={rev.id}
                review={rev}
                onVote={handleVote}
                onReport={(r) => {
                  setSelectedReviewForReport(r);
                  setReportModalOpen(true);
                }}
                onFacultyRespond={(r) => {
                  setSelectedReviewForFaculty(r);
                  setFacultyModalOpen(true);
                }}
              />
            ))}
          </div>
        </div>

        <div className="rmp-profile-sidebar">
          <div
            style={{
              backgroundColor: 'var(--ch-color-surface-elevated)',
              border: '1px solid var(--ch-color-border)',
              borderRadius: 'var(--ch-radius-lg)',
              padding: 'var(--ch-spacing-5)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--ch-spacing-4)'
            }}
          >
            <h3 style={{ fontSize: 'var(--ch-font-size-base)', fontWeight: 'bold' }}>
              Other Professors in {profile.department?.code || 'Department'}
            </h3>

            <ProfessorCard
              professor={{
                id: 'prof-102',
                slug: 'dr-ada-lovelace',
                fullName: 'Dr. Ada Lovelace',
                designation: 'Associate Professor',
                departmentName: 'Computer Science',
                departmentCode: 'CSE',
                photoUrl: null,
                bayesianRating: 4.92,
                totalReviewsCount: 58,
                recommendationPercentage: 96.0,
                topTags: ['Algorithm Genius', 'Clear Lectures']
              }}
            />
          </div>
        </div>
      </div>

      <WriteReviewModal
        isOpen={writeModalOpen}
        onClose={() => setWriteModalOpen(false)}
        profile={profile}
        onSubmit={handleWriteSubmit}
      />

      <ReportReviewModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        review={selectedReviewForReport}
        onSubmit={handleReportSubmit}
      />

      <FacultyResponseModal
        isOpen={facultyModalOpen}
        onClose={() => setFacultyModalOpen(false)}
        review={selectedReviewForFaculty}
        onSubmit={handleFacultySubmit}
      />
    </div>
  );
}
