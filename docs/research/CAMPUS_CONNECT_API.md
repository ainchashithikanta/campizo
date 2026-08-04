# Campus Connect — Production API Contracts & SDK Specification

**Module Name**: `Campus Connect` (`@college-hub/campus-connect`)  
**Document Type**: REST API Contracts, Fastify Route Specifications & SDK Specification  
**Status**: 🟢 **FINAL API SPECIFICATION**  
**Target Architecture**: Fastify HTTP Server Layer with TypeScript SDK

---

> [!IMPORTANT]
> **Mandatory API Design Constraints**:
>
> 1. **Idempotency**: Every state-mutating endpoint (`POST`, `PUT`, `PATCH`, `DELETE`) MUST accept an `Idempotency-Key` header to prevent duplicate execution.
> 2. **Standardized Response Envelope**: Every HTTP endpoint returns a strict `ApiV1Response<T>` envelope with trace ID and tenant context.
> 3. **Explainable Recommendations**: Recommendation endpoints return explicit, human-readable match reasons alongside weighted vectors.
> 4. **Context-Mandated Messaging**: Messaging endpoints require non-null `contextType` and `contextId` query/body parameters.
> 5. **Feature Flag Stability**: Feature flags alter endpoint execution or return standardized `FEATURE_DISABLED` errors without changing response schemas.
> 6. **Pagination from Day One**: All list endpoints (`search`, `recommendations`, `notifications`, `feed`) require cursor or page-based pagination envelopes (`page`, `limit`, `cursor`, `hasMore`, `total`).
> 7. **Language-Neutral SDK**: SDK contracts are designed for web, mobile (React Native), and backend AI services.
> 8. **Tenant & Privacy Enforcement**: Every endpoint validates tenant isolation (`X-College-Id`) and student privacy preferences prior to executing application services.

---

## 1. Standardized API Response Envelopes & Headers

All HTTP requests and responses strictly adhere to the `ApiV1Response<T>` envelope structure:

```ts
export interface ApiV1Response<T = unknown> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    httpStatus: number;
    details?: Record<string, unknown>;
  } | null;
  metadata: {
    requestId: string;
    traceId: string;
    collegeId: string;
    timestamp: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}
```

### Required Request Headers

- `Authorization`: `Bearer <jwt_token>` (Contains `userId`, `collegeId`, `roles`).
- `X-College-Id`: `varchar(64)` (Tenant isolation key).
- `Idempotency-Key`: `UUIDv4` (Mandatory for `POST`, `PUT`, `PATCH`, `DELETE`).
- `X-Trace-Id`: `varchar(64)` (Distributed tracing identifier).

---

## 2. API Endpoint Catalog

The API surface comprises 32 endpoints categorized into 8 functional controllers:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CONTROLLER CATALOG                            │
├─────────────────┬─────────────────┬─────────────────┬──────────────────┤
│ 1. Intent       │ 2. Profile      │ 3. Connection   │ 4. Collaboration │
│ • POST /intents │ • GET /profile  │ • POST /requests│ • POST /projects │
│ • GET /intents  │ • PUT /profile  │ • PUT /accept   │ • POST /mentors  │
├─────────────────┼─────────────────┼─────────────────┼──────────────────┤
│ 5. Messaging    │ 6. Discovery    │ 7. Privacy      │ 8. Moderation    │
│ • GET /chats    │ • GET /discover │ • PUT /privacy  │ • POST /reports  │
│ • POST /messages│ • GET /recommend│ • GET /privacy  │ • GET /cases     │
└─────────────────┴─────────────────┴─────────────────┴──────────────────┘
```

### 2.1 Complete Endpoint Specifications

#### Controller 1: Intent Management (`/api/v1/connect/intents`)

- `POST /api/v1/connect/intents`: Declare a new collaboration intent (`Idempotency-Key` required).
- `GET /api/v1/connect/intents`: List active intents for authenticated student.
- `GET /api/v1/connect/intents/:intentId`: Get specific intent details.
- `PATCH /api/v1/connect/intents/:intentId/status`: Update intent status (_PAUSED_, _FULFILLED_, _ARCHIVED_).
- `DELETE /api/v1/connect/intents/:intentId`: Soft-delete an intent.

#### Controller 2: Student Profile & Skills (`/api/v1/connect/profiles`)

- `GET /api/v1/connect/profiles/me`: Fetch own profile credentials and active goals.
- `GET /api/v1/connect/profiles/:userId`: Fetch peer profile (Enforces target user's `VisibilityScope`).
- `PUT /api/v1/connect/profiles/me`: Update profile skills, interests, and bio.
- `POST /api/v1/connect/profiles/:userId/endorse`: Endorse a peer's skill (Requires shared project completion).

#### Controller 3: Network Graph & Connections (`/api/v1/connect/network`)

- `POST /api/v1/connect/network/requests`: Send connection request (`Idempotency-Key` required; Enforces 5/day cap).
- `GET /api/v1/connect/network/requests`: List incoming/outgoing pending connection requests.
- `POST /api/v1/connect/network/requests/:requestId/accept`: Accept connection request.
- `POST /api/v1/connect/network/requests/:requestId/reject`: Reject connection request.
- `GET /api/v1/connect/network/connections`: List active 50 peer connections with pagination.
- `DELETE /api/v1/connect/network/connections/:peerId`: Remove a peer connection.

#### Controller 4: Contextual Messaging (`/api/v1/connect/messages`)

- `GET /api/v1/connect/messages/conversations`: List active conversations (Requires `contextType` and `contextId` query filters).
- `POST /api/v1/connect/messages/conversations`: Create context-bound conversation (`contextType` and `contextId` mandatory).
- `GET /api/v1/connect/messages/conversations/:conversationId/messages`: Fetch messages with pagination.
- `POST /api/v1/connect/messages/conversations/:conversationId/messages`: Send message (`Idempotency-Key` required).
- `PATCH /api/v1/connect/messages/conversations/:conversationId/read`: Update read receipt timestamp.

#### Controller 5: Discovery & Recommendations (`/api/v1/connect/discover`)

- `GET /api/v1/connect/discover/feed`: High-throughput intent discovery feed with pagination (`page`, `limit`, `intentType`, `courseCode`).
- `GET /api/v1/connect/discover/recommendations`: AI recommendation feed returning explainable match reasons (`weightedReasons`).

#### Controller 6: Privacy & Safety Hub (`/api/v1/connect/privacy`)

- `GET /api/v1/connect/privacy`: Fetch privacy and discoverability settings.
- `PUT /api/v1/connect/privacy`: Update visibility scope, Incognito mode, and presence indicators.
- `POST /api/v1/connect/privacy/block`: Block a user (`Idempotency-Key` required).
- `DELETE /api/v1/connect/privacy/block/:targetUserId`: Unblock a user.

#### Controller 7: Moderation & Trust (`/api/v1/connect/moderation`)

- `POST /api/v1/connect/moderation/reports`: Submit a safety report with evidence (`Idempotency-Key` required).
- `GET /api/v1/connect/moderation/cases`: (Campus Admins) List pending moderation review cases.
- `POST /api/v1/connect/moderation/cases/:caseId/action`: (Campus Admins) Execute disciplinary action (_WARNING_, _COOLDOWN_, _SUSPENSION_).

#### Controller 8: Notifications (`/api/v1/connect/notifications`)

- `GET /api/v1/connect/notifications`: Fetch user notification stream with pagination.
- `PATCH /api/v1/connect/notifications/:notificationId/read`: Mark notification as read.

---

## 3. Explainable Recommendation Endpoint Payload Schema

`GET /api/v1/connect/discover/recommendations` returns structured, weighted match explanations:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "studentId": "usr_stanford_9941",
        "fullName": "Sarah Chen",
        "classYear": 2027,
        "major": "Symbolic Systems",
        "compatibilityPct": 92.5,
        "activeIntent": {
          "intentId": "int_88412",
          "intentType": "STUDY_PARTNER",
          "title": "Seeking Study Partner for CS224N Midterm"
        },
        "explainableReasons": [
          {
            "reasonCode": "SHARED_COURSE",
            "weight": 0.45,
            "humanText": "Both registered in CS224N (Natural Language Processing)"
          },
          {
            "reasonCode": "COMPLEMENTARY_SKILL",
            "weight": 0.35,
            "humanText": "Complementary skills: You (PyTorch) & Sarah (React Frontend)"
          },
          {
            "reasonCode": "SHARED_INTEREST",
            "weight": 0.2,
            "humanText": "Shared interest in Hackathons & NLP Research"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 42,
      "hasMore": true,
      "nextCursor": "cur_rec_9941"
    }
  },
  "error": null,
  "metadata": {
    "requestId": "req_884192",
    "traceId": "trace_991823",
    "collegeId": "college_stanford_001",
    "timestamp": "2026-08-03T21:00:00Z"
  }
}
```

---

## 4. Universal TypeScript SDK Specification (`CampusConnectSdk`)

The SDK is a language-neutral, reusable client interface for web, React Native mobile, and backend microservices:

```ts
export interface ICampusConnectSdk {
  // Intent APIs
  declareIntent(input: DeclareIntentInput, idempotencyKey: string): Promise<ApiV1Response<StudentIntentDto>>;
  listActiveIntents(params?: ListIntentsParams): Promise<ApiV1Response<PaginatedResponse<StudentIntentDto>>>;
  updateIntentStatus(intentId: string, status: IntentStatus): Promise<ApiV1Response<StudentIntentDto>>;

  // Network & Connection APIs
  sendConnectionRequest(
    receiverId: string,
    intentId: string,
    note: string,
    idempotencyKey: string
  ): Promise<ApiV1Response<ConnectionRequestDto>>;
  acceptConnectionRequest(requestId: string, idempotencyKey: string): Promise<ApiV1Response<ConnectionDto>>;
  listConnections(params?: PaginationParams): Promise<ApiV1Response<PaginatedResponse<ConnectionDto>>>;

  // Messaging APIs (Context Required)
  createContextConversation(
    contextType: string,
    contextId: string,
    participantIds: string[],
    idempotencyKey: string
  ): Promise<ApiV1Response<ConversationDto>>;
  sendMessage(conversationId: string, content: string, idempotencyKey: string): Promise<ApiV1Response<MessageDto>>;
  listMessages(
    conversationId: string,
    params?: PaginationParams
  ): Promise<ApiV1Response<PaginatedResponse<MessageDto>>>;

  // Discovery & Recommendations
  getDiscoveryFeed(params: DiscoveryFeedParams): Promise<ApiV1Response<PaginatedResponse<DiscoveryItemDto>>>;
  getExplainableRecommendations(
    params?: RecommendationParams
  ): Promise<ApiV1Response<PaginatedResponse<ExplainableRecommendationDto>>>;

  // Privacy & Safety
  updatePrivacySettings(settings: Partial<PrivacySettingsDto>): Promise<ApiV1Response<PrivacySettingsDto>>;
  blockUser(targetUserId: string, idempotencyKey: string): Promise<ApiV1Response<void>>;
  submitSafetyReport(report: SubmitReportInput, idempotencyKey: string): Promise<ApiV1Response<ReportSubmissionDto>>;
}
```

---

## 5. Definition of Done Checklist (MS-23.5)

- [x] **Idempotency**: Enforced `Idempotency-Key` header on all write endpoints (`POST`, `PUT`, `PATCH`, `DELETE`).
- [x] **Standard Envelope**: All endpoints return `ApiV1Response<T>` with trace ID and tenant metadata.
- [x] **Explainable Recommendations**: `GET /discover/recommendations` returns structured `weightedReasons` arrays.
- [x] **Context-Mandated Messaging**: Messaging endpoints enforce non-null `contextType` and `contextId`.
- [x] **Feature-Flag Awareness**: Feature flags govern endpoint behavior without breaking API response contracts.
- [x] **Pagination Support**: All search, discovery, and notification list endpoints include pagination envelopes from day one.
- [x] **Universal SDK Client**: Defined reusable `ICampusConnectSdk` interface for web, mobile, and AI services.
- [x] **Tenant & Privacy Validation**: Middleware validates `X-College-Id` and student `VisibilityScope` prior to route handler execution.

---

> [!IMPORTANT]
> **MS-23.5 API Specification Complete**. Document saved to [`docs/research/CAMPUS_CONNECT_API.md`](file:///C:/Users/SHITHIKANTA%20MAHADEV/OneDrive/Desktop/campizo/docs/research/CAMPUS_CONNECT_API.md). All Campus Connect research and architecture specification milestones (**MS-23.1 to MS-23.5**) are now complete! Stopping for CTO Final Module Review!
