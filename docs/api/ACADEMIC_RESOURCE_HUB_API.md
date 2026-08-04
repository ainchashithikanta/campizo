# REST API Contracts & DTO Specification: Academic Resource Hub (MS-19.5)

## Document Information

- **Project**: College Hub (Enterprise Multi-College Platform)
- **Document Title**: OpenAPI & RESTful API Contracts, DTO Envelopes & Endpoint Catalogue: Academic Resource Hub
- **Target Audience**: Backend Engineers, Frontend Engineers, Mobile Lead Developers, API Integration Leads, QA Engineers
- **Status**: Official API Specification Standard (MS-19.5 Complete)
- **Implementation Constraint**: Pure API Contract & DTO Specification (Zero Code / Zero DB Implementation)

---

## 1. API Architecture Principles

### 1.1 Base URL & Versioning
- **Base URL Pattern**: `https://api.collegehub.edu/api/v1`
- **Versioning Strategy**: URI-based path versioning (`/v1/`).

### 1.2 Tenant Context & Auth Headers
Every HTTP request MUST include the following mandatory headers:
- `x-college-id`: Active college tenant UUID (e.g. `college-stanford-001`).
- `Authorization`: `Bearer <JWT_ACCESS_TOKEN>` (containing authenticated user identity and role claims).
- `x-request-id`: Client-generated or gateway-injected tracing UUID (e.g. `req-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d`).

---

### 1.3 Standardized API Response Envelopes

#### Success Response (`ApiV1Response<T>`)

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "timestamp": "2026-08-03T13:18:00.000Z",
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
    "code": "DUPLICATE_FILE_HASH",
    "message": "This exact file has already been uploaded by another student.",
    "requestId": "req-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "details": {
      "existingResourceId": "res-98765432-1098-7654-3210-987654321098"
    }
  }
}
```

---

## 2. Endpoint Catalogue

### 2.1 Resource Query & Directory Endpoints
- `GET /api/v1/resources`: Search and list study resources with pagination, department, semester, and scheme filters.
- `GET /api/v1/resources/search`: Debounced instant search matching keywords, subject codes (`CS501`), and uploader tags.
- `GET /api/v1/resources/trending`: Fetch high-velocity downloads and trending materials for upcoming exams.
- `GET /api/v1/resources/:resourceId`: Fetch full composite details of a single resource (metadata, current version, files, stats).

### 2.2 Resource Lifecycle Endpoints
- `POST /api/v1/resources`: Create a new draft resource record.
- `POST /api/v1/resources/:resourceId/publish`: Publish a draft or pending resource.
- `POST /api/v1/resources/:resourceId/archive`: Archive an outdated resource.
- `DELETE /api/v1/resources/:resourceId`: Soft-delete a resource (24-hour author window).

### 2.3 Version Control Endpoints
- `GET /api/v1/resources/:resourceId/versions`: Fetch version history lineage.
- `POST /api/v1/resources/:resourceId/versions`: Upload and attach a new revision version (e.g. Version 2).
- `POST /api/v1/resources/:resourceId/versions/:versionId/rollback`: Rollback current version pointer to a historical version.

### 2.4 Upload & Pre-Signed S3 File Endpoints
- `POST /api/v1/resources/upload-session`: Initialize a pre-signed S3 upload session with client-side SHA-256 checksum validation.
- `GET /api/v1/resources/upload-session/:sessionId`: Poll upload processing and pre-flight validation status.
- `GET /api/v1/resources/:resourceId/download-url`: Generate a secure, short-lived pre-signed S3 download URL.
- `GET /api/v1/resources/:resourceId/preview-urls`: Fetch multi-page web preview image URLs.

### 2.5 Study Collection Endpoints
- `GET /api/v1/collections`: List public and personal study collections ("Exam Survival Kits").
- `POST /api/v1/collections`: Create a new study collection bundle.
- `GET /api/v1/collections/:collectionId`: Fetch collection details and ordered resource items.
- `POST /api/v1/collections/:collectionId/items`: Add a resource to a collection.
- `PUT /api/v1/collections/:collectionId/reorder`: Reorder resource items within a collection.

### 2.6 Engagement & Reporting Endpoints
- `POST /api/v1/resources/:resourceId/votes`: Vote `HELPFUL` or `UNHELPFUL` on a resource.
- `POST /api/v1/resources/:resourceId/bookmarks`: Bookmark a resource for quick access.
- `DELETE /api/v1/resources/:resourceId/bookmarks`: Remove a bookmark.
- `POST /api/v1/resources/:resourceId/reports`: Report a resource for spam, copyright violation, or bad file quality.

---

## 3. Data Transfer Objects (DTO) Specifications

### 3.1 `AcademicResourceSummaryDto`

```typescript
export interface AcademicResourceSummaryDto {
  id: string;
  title: string;
  slug: string;
  subjectCode: string;
  subjectName: string;
  semesterNumber: number;
  categoryCode: 'PYQ' | 'LECTURE_NOTES' | 'LAB_MANUAL' | 'FORMULA_SHEET' | 'SYLLABUS_COPY';
  schemeCode: string | null;
  academicYear: string;
  isAnonymous: boolean;
  authorDisplayName: string | null;
  verificationStatus: 'UNVERIFIED' | 'STUDENT_VERIFIED' | 'FACULTY_VERIFIED';
  qualityScore: number; // e.g. 4.85
  totalDownloads: number;
  helpfulVotes: number;
  pageCount: number | null;
  fileSizeBytes: number;
  createdAt: string;
}
```

### 3.2 `AcademicResourceDetailDto`

```typescript
export interface AcademicResourceDetailDto {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  department: {
    id: string;
    code: string;
    name: string;
  };
  subject: {
    id: string;
    code: string;
    name: string;
    semesterNumber: number;
  };
  scheme: {
    id: string;
    code: string;
    title: string;
  } | null;
  examType: {
    code: string;
    displayLabel: string;
  } | null;
  resourceType: {
    code: string;
    displayLabel: string;
  };
  uploader: {
    userId: string;
    displayName: string;
    isAnonymous: boolean;
    verificationBadge: string;
  };
  currentVersion: ResourceVersionDto;
  statistics: ResourceStatisticsDto;
  userInteractions: {
    hasVoted: 'HELPFUL' | 'UNHELPFUL' | null;
    isBookmarked: boolean;
  };
  createdAt: string;
  updatedAt: string;
}
```

### 3.3 `ResourceVersionDto`

```typescript
export interface ResourceVersionDto {
  id: string;
  resourceId: string;
  versionNumber: number;
  changelogNotes: string | null;
  files: ResourceFileDto[];
  createdByUserId: string;
  createdAt: string;
}
```

### 3.4 `ResourceFileDto`

```typescript
export interface ResourceFileDto {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  sha256Hash: string;
  pageCount: number | null;
  hasPreview: boolean;
  virusScanStatus: 'CLEAN' | 'PENDING' | 'INFECTED';
  createdAt: string;
}
```

### 3.5 `UploadSessionDto`

```typescript
export interface UploadSessionDto {
  sessionId: string;
  preSignedUploadUrl: string;
  storageKey: string;
  expiresAt: string;
  fileRequirements: {
    maxSizeBytes: number;
    allowedMimeTypes: string[];
  };
}
```

---

## 4. Role-Based Access Control (RBAC) Permission Matrix

| Endpoint Group | Anonymous Visitor | Authenticated Student | Verified CR / Contributor | Verified Faculty | Moderator / Admin |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET /resources` (Search/List) | ✅ Read | ✅ Read | ✅ Read | ✅ Read | ✅ Read |
| `GET /resources/:id/download-url` | ❌ Denied | ✅ Pre-Signed DL | ✅ Pre-Signed DL | ✅ Pre-Signed DL | ✅ Pre-Signed DL |
| `POST /resources/upload-session` | ❌ Denied | ✅ Create Session | ✅ Create Session | ✅ Create Session | ✅ Full Control |
| `POST /resources/:id/publish` | ❌ Denied | ✅ Auto-Publish | ✅ Instant Publish | ✅ Instant Publish | ✅ Full Control |
| `POST /resources/:id/votes` | ❌ Denied | ✅ Single Vote | ✅ Single Vote | ✅ Single Vote | ✅ Full Control |
| `POST /resources/:id/reports` | ❌ Denied | ✅ Flag Resource | ✅ Flag Resource | ✅ Flag Resource | ✅ Full Control |
| `PATCH /moderation/resources` | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied | ✅ Full Moderation |

---

## 5. Standardized Error Catalogue

| HTTP Status | Error Code | Description |
| :--- | :--- | :--- |
| **400 Bad Request** | `INVALID_INPUT` | Zod validation failed (e.g. title $< 5$ chars, illegal file MIME). |
| **400 Bad Request** | `DUPLICATE_FILE_HASH` | File SHA-256 checksum matches existing resource in college repository. |
| **401 Unauthorized** | `AUTHENTICATION_REQUIRED` | Missing or invalid `.edu` Bearer JWT token. |
| **403 Forbidden** | `SELF_VOTE_PROHIBITED` | Uploader attempted to upvote/downvote their own study material. |
| **403 Forbidden** | `TENANT_MISMATCH` | Authenticated student belongs to a different college tenant. |
| **404 Not Found** | `RESOURCE_NOT_FOUND` | Resource ID or slug does not exist in the tenant college context. |
| **409 Conflict** | `VERSION_CONFLICT` | Target version number already exists for this resource. |
| **422 Unprocessable** | `VIRUS_SCAN_FAILED` | Uploaded binary failed virus scan or pre-flight PDF integrity check. |
| **429 Too Many Requests**| `RATE_LIMIT_EXCEEDED` | Exceeded 5 uploads per day or 100 API calls per minute threshold. |

---

## 6. Mobile Optimization & Bandwidth Strategy

1. **Composite Read Endpoint**: `GET /api/v1/resources/:resourceId` returns resource metadata, current version files, pre-computed statistics, and user interaction states in a single payload, avoiding 4 separate API round trips on mobile networks.
2. **HTTP Cache Control & ETags**: `GET /api/v1/resources` emits `Cache-Control: public, max-age=60, s-maxage=300` and `ETag` headers for instant client-side caching.
3. **Lazy Page Rendering**: Preview endpoints return JSON arrays of image thumbnail URLs loaded incrementally as the student scrolls the preview canvas.

---

## 7. Future Extensibility DTO Reservations

The API schema reserves DTO fields for future extensions without breaking contract changes:

```typescript
export interface ResourceExtensionsDto {
  videoLectureUrl?: string;
  audioSummaryUrl?: string;
  aiGeneratedSummaryText?: string;
  linkedQuizCount?: number;
  discussionThreadId?: string;
}
```

---

## 8. Definition of Done Verification

| API Requirement | Verification Status | Rationale / Reference |
| :--- | :--- | :--- |
| **Multi-Tenant REST Standard** | ✅ Verified | Base URL `/api/v1/` and mandatory `x-college-id` headers. |
| **Pre-Signed Upload Session** | ✅ Verified | SHA-256 pre-flight validation and short-lived S3 upload sessions. |
| **Strongly Typed DTOs** | ✅ Verified | TypeScript interfaces for all summary, detail, file, and collection payloads. |
| **Error Catalogue** | ✅ Verified | Standardized error codes and HTTP status mappings. |
| **No Code Implementation** | ✅ Verified | Pure API contract & DTO specification. |

---

_End of REST API Contracts & DTO Specification: Academic Resource Hub (MS-19.5)._
