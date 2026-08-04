# MS-21.5 — API Contracts & DTO Specification: Campus Confessions

## Executive Summary & API Standards

This specification defines the production HTTP REST API contracts, Request/Response envelopes, Data Transfer Objects (DTOs), Input Validation Rules, Rate Limiting Matrix, and Role-Based Access Control (RBAC) matrix for the **College Hub Campus Confessions** module.

All endpoints adhere to RESTful principles, versioned namespace `/api/v1/confessions/...`, JSON request/response formats, mandatory tenant isolation headers, and unified response envelopes.

---

## 1. Request Headers & Response Envelopes

### 1.1 Mandatory HTTP Headers

| Header Key          | Type   |  Requirement  | Description                                                               |
| :------------------ | :----- | :-----------: | :------------------------------------------------------------------------ |
| `Authorization`     | String | **Mandatory** | Bearer JWT containing authenticated user identity (`sub`, `roles`).       |
| `x-college-id`      | String | **Mandatory** | Tenant scope identifier (`college-stanford-001`). Enforces RLS isolation. |
| `x-request-id`      | String | **Mandatory** | Distributed tracing UUID for cross-service logging.                       |
| `x-idempotency-key` | String |  Conditional  | Required for write operations (`POST`, `PUT`, `DELETE`).                  |

---

### 1.2 Rate Limiting Protection Matrix

| Operation           | Rate Limit Window | Maximum Allowed    | Enforcement Action         |
| :------------------ | :---------------- | :----------------- | :------------------------- |
| Confession Creation | 1 Hour            | 5 posts / user     | HTTP 429 Too Many Requests |
| Comment Creation    | 1 Hour            | 30 comments / user | HTTP 429 Too Many Requests |
| Voting Actions      | 1 Minute          | 120 votes / user   | HTTP 429 Too Many Requests |
| Abuse Reporting     | 1 Hour            | 10 reports / user  | HTTP 429 Too Many Requests |
| Keyword Search      | 1 Minute          | 60 queries / user  | HTTP 429 Too Many Requests |

---

## 2. REST Endpoint Catalog

### 2.1 Dedicated Campus Feed Endpoints

- **`GET /api/v1/confessions/feed/trending`**: Returns trending confessions ranked by policy.
- **`GET /api/v1/confessions/feed/latest`**: Returns reverse-chronological feed.
- **`GET /api/v1/confessions/feed/categories/:category`**: Returns feed filtered by category code.
- **`GET /api/v1/confessions/feed/saved`**: Returns current user's bookmarked confessions.
- **`GET /api/v1/confessions/feed/my-activity`**: Returns current user's posted confessions.
- **`GET /api/v1/confessions/search`**: Instant keyword search.

---

### 2.2 Confession & Composite Detail Endpoints

- **`POST /api/v1/confessions`**: Submits a new anonymous confession.
  - _Payload_: `{ categoryCode: string; title: string; content: string }`
- **`GET /api/v1/confessions/:id`**: Composite read model endpoint returning confession, comments, statistics, current user vote, current user bookmark, related confessions, and thread pseudonyms in 1 request.
- **`POST /api/v1/confessions/:id/vote`**: Explicit voting action (`UPVOTE` | `DOWNVOTE` | `REMOVE`).
  - _Payload_: `{ voteType: 'UPVOTE' | 'DOWNVOTE' | 'REMOVE' }`
- **`POST /api/v1/confessions/:id/bookmark`**: Toggles saved bookmark state.
- **`POST /api/v1/confessions/:id/report`**: Flags a confession for moderation.

---

### 2.3 Comment Endpoints

- **`POST /api/v1/confessions/:id/comments`**: Adds a reply to a confession or nested comment.
  - _Payload_: `{ parentCommentId?: string; content: string }`
- **`POST /api/v1/confessions/comments/:commentId/soft-delete`**: Soft-deletes a comment (`[Comment removed by moderation]`).

---

### 2.4 Blind Moderation Endpoints

- **`GET /api/v1/confessions/moderation/queue`**: Severity-prioritized review queue.
- **`POST /api/v1/confessions/moderation/:caseId/decide`**: Records decision (`RESTORE`, `HIDE`, `DELETE`, `ESCALATE`).
- **`POST /api/v1/confessions/moderation/:caseId/notes`**: Adds internal moderator notes (never exposed to regular users).

---

## 3. TypeScript DTO Specifications

```typescript
export interface ConfessionDetailDto {
  confession: ConfessionSummaryDto & { content: string };
  comments: CommentDto[];
  statistics: {
    totalViews: number;
    totalUpvotes: number;
    totalComments: number;
    trendingScore: number;
  };
  currentUserState: {
    hasBookmarked: boolean;
    userVoteType?: 'UPVOTE' | 'DOWNVOTE' | null;
  };
  relatedConfessions: ConfessionSummaryDto[];
}
```

---

## Deliverables & Sign-Off Summary

- ✅ **Composite Read Model**: Designed `GET /api/v1/confessions/:id` returning complete thread payload in 1 request.
- ✅ **Dedicated Feed APIs**: Separated `feed/trending`, `feed/latest`, `feed/categories/:category`, `feed/saved`, `feed/my-activity`.
- ✅ **Explicit Voting Action**: Enforced explicit `voteType` (`UPVOTE`, `DOWNVOTE`, `REMOVE`).
- ✅ **Internal Moderator Notes**: Added `POST /moderation/:caseId/notes`.
- ✅ **Rate Limiting Matrix**: Defined protection thresholds for creation, comments, voting, reports, and search.

> [!IMPORTANT]
> **MS-21.5 Approved with Refinements**. Ready for **MS-21.6 (Technical Architecture & Technology Blueprint)**.
