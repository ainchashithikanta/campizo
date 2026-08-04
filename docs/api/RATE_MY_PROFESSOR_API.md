# API Contracts & DTO Specification: Rate My Professor Module (MS-18.5)

## Document Information

- **Project**: College Hub (Enterprise Multi-College Platform)
- **Document Title**: OpenAPI & RESTful API Contracts, DTO Envelopes & Endpoint Catalogue
- **Target Audience**: Backend Engineers, Frontend Engineers, Mobile Developers (iOS/Android), API Integration Leads
- **Status**: Official API Specification Standard (MS-18.5 Complete)
- **Implementation Constraint**: Pure API Design & DTO Specification (Zero Code / Zero DB Implementation)

---

## 1. API Architecture Principles

### 1.1 Versioning & Base URL

- **Base URL Pattern**: `https://api.collegehub.edu/api/v1`
- **Tenant Context Headers**: All requests MUST include `x-college-id` or `x-college-slug`.

### 1.2 Standardized API Response Envelopes

Every endpoint returns a consistent JSON envelope:

#### Success Response (`ApiV1Response<T>`)

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "timestamp": "2026-08-02T23:56:00.000Z",
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 142,
      "totalPages": 8,
      "hasNextPage": true
    }
  }
}
```

#### Error Response (`ApiV1ErrorResponse`)

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_REVIEW_FOR_TERM",
    "message": "You have already submitted a review for this professor in the current semester.",
    "requestId": "req-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
  }
}
```

---

## 2. Endpoint Catalogue

### 2.1 Professor Directory & Search

- `GET /api/v1/professors`: Search and list professors with filtering, sorting, and pagination.
- `GET /api/v1/professors/trending`: Fetch trending professors with recent review velocity.
- `GET /api/v1/professors/top-rated`: Fetch top-rated professors based on Bayesian weighted score.
- `GET /api/v1/professors/recently-reviewed`: Fetch professors with recent student activity.
- `GET /api/v1/departments`: List all academic departments within the college.
- `GET /api/v1/courses`: List all subjects and courses.

### 2.2 Professor Profile & Reviews

- `GET /api/v1/professors/:slug`: Fetch detailed professor profile header and statistics summary.
- `GET /api/v1/professors/:slug/reviews`: Fetch paginated student reviews with filtering (by semester, rating, tag) and sorting (_Most Helpful_, _Recent_).
- `POST /api/v1/professors/:slug/reviews`: Submit a new multi-attribute student review.
- `PUT /api/v1/professors/:slug/reviews/:reviewId`: Edit an existing review (24-hour window restriction).
- `DELETE /api/v1/professors/:slug/reviews/:reviewId`: Soft-delete an existing review (24-hour window restriction).

### 2.3 Review Interactions (Voting & Reporting)

- `POST /api/v1/professors/:slug/reviews/:reviewId/votes`: Vote `HELPFUL` or `UNHELPFUL` on a review.
- `DELETE /api/v1/professors/:slug/reviews/:reviewId/votes`: Remove a previously cast vote.
- `POST /api/v1/professors/:slug/reviews/:reviewId/reports`: Report a review for spam, harassment, or retaliation.

### 2.4 Faculty & Moderation Endpoints

- `POST /api/v1/professors/:slug/reviews/:reviewId/response`: Submit a verified faculty counter-response.
- `PATCH /api/v1/moderation/reviews/:reviewId`: Moderator decision (`APPROVE`, `HIDE`, `REJECT`).
- `POST /api/v1/admin/professors/merge`: Merge duplicate professor profiles into a target profile.

---

## 3. Data Transfer Objects (DTO) Specification

### 3.1 `ProfessorSummaryDto`

```typescript
export interface ProfessorSummaryDto {
  id: string;
  slug: string;
  fullName: string;
  designation: string;
  departmentName: string;
  departmentCode: string;
  photoUrl: string | null;
  bayesianRating: number; // e.g. 4.65
  totalReviewsCount: number;
  recommendationPercentage: number; // e.g. 88.5
  topTags: string[]; // e.g. ["Tough Grader", "Pop Quizzes"]
}
```

### 3.2 `ProfessorProfileDto`

```typescript
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
```

### 3.3 `ProfessorStatisticsDto`

```typescript
export interface ProfessorStatisticsDto {
  bayesianRating: number;
  rawAverageRating: number;
  totalReviewsCount: number;
  recommendationPercentage: number;
  ratingConfidenceScore: number; // 0.00 to 1.00
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
  lastCalculatedAt: string; // ISO 8601
}
```

### 3.4 `ReviewDto`

```typescript
export interface ReviewDto {
  id: string;
  professorId: string;
  courseCode: string;
  courseName: string;
  academicYear: string; // "2024-25"
  semester: string; // "5th Sem"
  authorAnonymousToken: string;
  isAnonymous: boolean;
  authorDisplayName: string | null;
  gradeReceived: string | null; // "A+", "B", etc.
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
  userVote: 'HELPFUL' | 'UNHELPFUL' | null; // Current authenticated user's vote
  facultyResponse: FacultyResponseDto | null;
  createdAt: string;
  isEditable: boolean; // True if within 24-hour edit window for author
}
```

### 3.5 `ReviewCreateRequest`

```typescript
export interface ReviewCreateRequest {
  courseId: string;
  academicYear: string;
  semester: string;
  isAnonymous?: boolean; // Default true
  gradeReceived?: string; // Optional
  reviewText: string; // Min 20, Max 1000 chars
  dimensions: {
    teachingClarity: number; // 1 to 5
    gradingFairness: number; // 1 to 5
    punctuality: number; // 1 to 5
    approachability: number; // 1 to 5
  };
  tags?: string[]; // Max 3 tags
}
```

---

## 4. Query Parameters Specification

- `search`: String term matching professor name, course code, or search alias (e.g. `?search=CS101`).
- `dept`: Filter by department code (e.g. `?dept=CSE`).
- `minRating`: Filter by minimum Bayesian rating (e.g. `?minRating=4.0`).
- `sortBy`: `MOST_HELPFUL` | `RECENT` | `HIGHEST_RATED` | `LOWEST_RATED`.
- `page`: Integer page number (default `1`).
- `limit`: Items per page (default `20`, max `50`).

---

## 5. Error Catalogue

| HTTP Status               | Error Code                  | Description                                                        |
| ------------------------- | --------------------------- | ------------------------------------------------------------------ |
| **400 Bad Request**       | `INVALID_INPUT`             | Zod schema validation failed (e.g. review text < 20 chars).        |
| **401 Unauthorized**      | `AUTHENTICATION_REQUIRED`   | Missing or invalid `.edu` Bearer JWT token.                        |
| **403 Forbidden**         | `DUPLICATE_REVIEW_FOR_TERM` | Student already submitted a review for this professor in the term. |
| **403 Forbidden**         | `EDIT_WINDOW_EXPIRED`       | Attempted to edit or delete a review after the 24-hour window.     |
| **404 Not Found**         | `PROFESSOR_NOT_FOUND`       | Professor slug does not exist in the tenant college context.       |
| **429 Too Many Requests** | `RATE_LIMIT_EXCEEDED`       | Request velocity limit exceeded for IP or user.                    |

---

## 6. Mobile Optimization & Performance Strategy

1. **Composite Read Endpoints**: `GET /api/v1/professors/:slug` returns profile headers and pre-computed statistics in a single HTTP payload, eliminating N+1 API requests on mobile network connections.
2. **Infinite Scroll Pagination**: `meta.pagination.hasNextPage` enables seamless mobile feed loading.
3. **HTTP Cache Control & ETags**: `GET /api/v1/professors` emits `Cache-Control: public, max-age=60, s-maxage=300` and `ETag` headers for instant mobile client caching.

---

_End of API Contracts & DTO Specification (MS-18.5)._
