/**
 * Rate My Professor — TypeScript DTO Types
 * Matches the approved API specification (MS-18.5)
 */

/* ---------- Professor DTOs ---------- */

export interface DepartmentSummaryDto {
  id: string;
  name: string;
  shortName: string;
  professorCount: number;
  averageBayesianRating: number;
  totalReviews: number;
}

export interface ProfessorSummaryDto {
  id: string;
  slug: string;
  fullName: string;
  designation: string;
  departmentName: string;
  departmentCode: string;
  photoUrl: string | null;
  bayesianRating: number;
  totalReviewsCount: number;
  recommendationPercentage: number;
  topTags: string[];
}

export interface ProfessorProfileDto {
  id: string;
  slug: string;
  fullName: string;
  designation: string;
  status: 'ACTIVE' | 'VISITING' | 'RETIRED' | 'ON_LEAVE';
  department: {
    id: string;
    name: string;
    code: string;
  };
  biography: string | null;
  photoUrl: string | null;
  coursesTaught: Array<{
    courseId: string;
    code: string;
    name: string;
  }>;
  statistics: ProfessorStatisticsDto;
}

export interface ProfessorStatisticsDto {
  bayesianRating: number;
  rawAverageRating: number;
  totalReviewsCount: number;
  recommendationPercentage: number;
  ratingConfidenceScore: number;
  ratingDimensions: {
    teachingClarity: number;
    gradingFairness: number;
    punctuality: number;
    approachability: number;
  };
  starDistribution: {
    star5: number;
    star4: number;
    star3: number;
    star2: number;
    star1: number;
  };
  lastCalculatedAt: string;
}

/* ---------- Review DTOs ---------- */

export interface ReviewDto {
  id: string;
  professorId: string;
  courseCode: string;
  courseName: string;
  academicYear: string;
  semester: string;
  authorAnonymousToken: string;
  isAnonymous: boolean;
  authorDisplayName: string | null;
  gradeReceived: string | null;
  reviewText: string;
  overallRating: number;
  dimensions: {
    teachingClarity: number;
    gradingFairness: number;
    punctuality: number;
    approachability: number;
  };
  tags: string[];
  helpfulCount: number;
  unhelpfulCount: number;
  userVote: 'HELPFUL' | 'UNHELPFUL' | null;
  facultyResponse: FacultyResponseDto | null;
  createdAt: string;
  isEditable: boolean;
}

export interface FacultyResponseDto {
  id: string;
  responseText: string;
  respondedAt: string;
}

/* ---------- Request DTOs ---------- */

export interface ReviewCreateRequest {
  courseAssignmentId: string;
  reviewText: string;
  overallRating: number;
  isAnonymous?: boolean;
  gradeReceived?: string;
  dimensions?: {
    teachingClarity: number;
    gradingFairness: number;
    punctuality: number;
    approachability: number;
  };
  tags?: string[];
}

export interface ReviewEditRequest {
  newReviewText: string;
  newOverallRating: number;
}

export interface VoteRequest {
  voteType: 'HELPFUL' | 'UNHELPFUL';
}

export interface ReportRequest {
  reason: string;
  details?: string;
}

export interface FacultyResponseRequest {
  responseText: string;
}

export interface SearchParams {
  query?: string;
  dept?: string;
  page?: number;
  limit?: number;
  minRating?: number;
  sortBy?: 'MOST_HELPFUL' | 'RECENT' | 'HIGHEST_RATED' | 'LOWEST_RATED';
}

/* ---------- API Envelope Types ---------- */

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
    pagination?: PaginationMeta;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/* ---------- UI State Types ---------- */

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  state: LoadingState;
}

export type RatingQuality = 'excellent' | 'good' | 'average' | 'below' | 'poor';

export function getRatingQuality(rating: number): RatingQuality {
  if (rating >= 4.5) return 'excellent';
  if (rating >= 3.5) return 'good';
  if (rating >= 2.5) return 'average';
  if (rating >= 1.5) return 'below';
  return 'poor';
}

export function getRatingLabel(quality: RatingQuality): string {
  const labels: Record<RatingQuality, string> = {
    excellent: 'Excellent',
    good: 'Good',
    average: 'Average',
    below: 'Below Average',
    poor: 'Poor'
  };
  return labels[quality];
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffMon = Math.floor(diffDay / 30);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  if (diffMon < 12) return `${diffMon}mo ago`;
  return new Date(dateString).toLocaleDateString();
}
