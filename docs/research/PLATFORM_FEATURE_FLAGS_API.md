# MS-22.5 — API Contracts & Client SDK Interfaces Specification (Platform Feature Management System)

**Document Type**: API Architecture & Interface Specification  
**Status**: APPROVED BY CTO / API SPECIFICATION  
**Target Module**: `@college-hub/platform-feature-flags` (Shared Platform Core Service)  

---

## Executive Summary

The **Platform Feature Management System** API layer provides deterministic, secure, high-throughput REST endpoints, real-time configuration streaming (SSE/WebSocket), evaluation explainability, batch cache refresh operations, and language-neutral client SDK interfaces.

Designed for sub-millisecond local evaluation and sub-10ms API gateway responses, the API architecture exposes comprehensive management, evaluation, dependency graph inspection, approval governance, configuration snapshot restoration, platform health telemetry, and real-time webhook capabilities for all College Hub modules.

---

## Section 1 — API Standards, Versioning & Compatibility Policy

### 1.1 Base URL & Versioning Strategy
- **Base URL**: `https://api.collegehub.edu/api/v1/feature-flags`
- **Versioning**: URI path versioning (`/v1/`).

### 1.2 API Compatibility & Deprecation Policy
1. **Additive-Only Changes in v1**: New endpoints, optional request parameters, and additional response fields are introduced without version bumps.
2. **Semantic Versioning**: Minor updates for non-breaking additions; major version bumps (`/v2/`) reserved exclusively for breaking structural changes.
3. **Deprecation Policy**: Minimum 6-month formal deprecation notice prior to retiring any `/v1/` endpoint.
4. **Long-Term SDK Support Policy**: Client SDK versions maintained for 12 months minimum after major releases.

### 1.3 Mandatory Request Headers
- `Authorization`: `Bearer <jwt_token>` (Admin/Service API Token).
- `x-college-id`: Target campus tenant identifier.
- `x-request-id`: Distributed correlation ID for tracing.
- `x-idempotency-key`: Required for write endpoints (`POST`, `PUT`, `DELETE`).
- `x-client-environment`: `DEVELOPMENT` | `TESTING` | `STAGING` | `PRODUCTION`.

---

## Section 2 — Feature Management REST APIs

| Method | Endpoint | Description | HTTP Status |
|--------|----------|-------------|-------------|
| `GET` | `/api/v1/feature-flags` | List all flags with search/filter params | `200 OK` |
| `POST` | `/api/v1/feature-flags` | Create a new feature flag definition | `201 Created` |
| `GET` | `/api/v1/feature-flags/:key` | Fetch detailed flag definition | `200 OK` / `404` |
| `PUT` | `/api/v1/feature-flags/:key` | Update flag rules and metadata | `200 OK` |
| `POST` | `/api/v1/feature-flags/:key/enable` | Enable flag in environment | `200 OK` |
| `POST` | `/api/v1/feature-flags/:key/disable` | Disable flag in environment | `200 OK` |
| `POST` | `/api/v1/feature-flags/:key/archive` | Move flag to `DEPRECATED` stage | `200 OK` |
| `POST` | `/api/v1/feature-flags/:key/restore` | Restore archived flag | `200 OK` |
| `DELETE` | `/api/v1/feature-flags/:key` | Soft delete flag (`REMOVED` stage) | `200 OK` |

---

## Section 3 — Evaluation REST APIs & Explain Mode

### `POST /api/v1/feature-flags/evaluate?explain=true`
Evaluates a single feature flag with optional **Evaluation Explain Mode**.

#### Request Body
```json
{
  "flagKey": "marketplace.p2p_chat",
  "context": {
    "collegeId": "college-stanford-001",
    "userId": "user-student-101",
    "role": "STUDENT",
    "appVersion": "2.4.0"
  }
}
```

#### Response Payload (`EvaluationResult` with Explainability)
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "reason": "PERCENTAGE_BUCKET_MATCH",
    "matchedRule": "CanaryRolloutPolicy_25Percent",
    "evaluationTimeMs": 0.42,
    "cacheSource": "LOCAL_MEMORY",
    "evaluatedEnvironment": "PRODUCTION",
    "explanation": {
      "decisionExplanation": "User user-student-101 (hash bucket 18) matched Canary 25% bucket threshold.",
      "skippedRules": [
        "KillSwitchPolicy (Inactive)",
        "MaintenancePolicy (Inactive)",
        "UserOverridePolicy (No Match)",
        "RoleOverridePolicy (No Match)"
      ],
      "evaluationTimeline": [
        { "policy": "KillSwitchPolicy", "outcome": "PASSED", "durationMs": 0.05 },
        { "policy": "MaintenancePolicy", "outcome": "PASSED", "durationMs": 0.04 },
        { "policy": "OverridePolicy", "outcome": "NO_MATCH", "durationMs": 0.12 },
        { "policy": "RolloutPolicy", "outcome": "MATCHED", "durationMs": 0.21 }
      ]
    }
  }
}
```

---

## Section 4 — Real-Time Configuration Streaming (SSE / WebSockets)

For clients requiring instant sub-50ms feature update notifications:

- **Server-Sent Events (SSE)**: `GET /api/v1/feature-flags/stream`
  - Headers: `Accept: text/event-stream`
  - Emits real-time JSON stream on flag changes:
    ```eventstream
    event: flag_update
    data: {"flagKey":"confessions.voting","enabled":false,"environment":"PRODUCTION","timestamp":"2026-08-03T19:44:00Z"}
    ```
- **WebSocket Streaming**: `WS /api/v1/feature-flags/ws`
  - Bi-directional channel for high-density app clients subscribing to targeted feature packs.

---

## Section 5 — Batch Cache Refresh & Maintenance APIs

- `POST /api/v1/feature-flags/cache/refresh`: Triggers batch cache purge and re-population across Redis and distributed application nodes.
- `POST /api/v1/feature-flags/cache/warm`: Pre-warms evaluation memory maps for an environment.

---

## Section 6 — Platform Health & Diagnostics APIs

### `GET /api/v1/feature-flags/health`
Returns comprehensive operational health telemetry:

```json
{
  "success": true,
  "data": {
    "status": "HEALTHY",
    "cacheStatus": { "redis": "CONNECTED", "hitRate": 99.85 },
    "evaluationLatency": { "p50Ms": 0.12, "p95Ms": 0.45, "p99Ms": 1.20 },
    "pubSubConnectivity": { "activeChannels": 4, "messagesPerSec": 120 },
    "snapshotFreshness": { "lastSnapshot": "2026-08-03T18:00:00Z", "ageHours": 1.7 },
    "workerHealth": { "activeWorkers": 8, "queueWaitMs": 2 }
  }
}
```

---

## Section 7 — Dependency & DAG Visualizer APIs

- `POST /api/v1/feature-flags/dependencies`: Create dependency edge.
- `GET /api/v1/feature-flags/dependencies/validate-graph`: Validate full platform DAG graph.
- `POST /api/v1/feature-flags/dependencies/impact-analysis`: Calculate blast radius of disabling a feature.

---

## Section 8 — Rollout, Approval & Snapshot APIs

- `POST /api/v1/feature-flags/:key/rollouts`: Create canary/stepped rollout.
- `POST /api/v1/feature-flags/approvals`: Submit change approval request.
- `POST /api/v1/feature-flags/snapshots`: Create point-in-time configuration snapshot.
- `POST /api/v1/feature-flags/snapshots/:id/restore`: 1-click restore to historical snapshot.

---

## Section 9 — Emergency Kill Switch APIs

- `POST /api/v1/feature-flags/kill-switches/activate`: Trip emergency kill switch.
- `POST /api/v1/feature-flags/kill-switches/deactivate`: Release emergency kill switch.

---

## Section 10 — Language-Neutral SDK Contracts

### 10.1 `FeatureEvaluationService` (SDK Contract)
- `evaluate(flagKey, context): EvaluationResult`: Local in-memory evaluation in $< 1\text{ ms}$.
- `evaluateWithExplain(flagKey, context): EvaluationResult`: Detailed evaluation with explainability breakdown.

---

## Section 11 — Webhook Events & Notifications

Signed HMAC-SHA256 webhooks for `feature.enabled`, `feature.disabled`, `kill_switch.activated`, `approval.granted`, `snapshot.restored`, `lifecycle.changed`.

---

## Section 12 — Typed API Error Catalog

| Error Code | HTTP Status | Trigger Condition |
|------------|-------------|-------------------|
| `FEATURE_NOT_FOUND` | `404 Not Found` | Requested `flagKey` does not exist |
| `CIRCULAR_DEPENDENCY` | `400 Bad Request` | Dependency loop detected during graph modification |
| `DEPENDENCY_NOT_SATISFIED` | `422 Unprocessable` | Prerequisite feature is disabled |
| `KILL_SWITCH_ACTIVE` | `423 Locked` | Action blocked due to active emergency kill switch |
| `MAINTENANCE_ACTIVE` | `503 Service Unavailable` | Write action attempted during active maintenance |

---

## Section 13 — Performance Targets & Guarantees

- **Local SDK Evaluation**: $< 1\text{ ms}$ (In-memory lookup; zero network I/O).
- **API Gateway Evaluation Endpoint**: p95 $< 10\text{ ms}$.
- **Bulk Evaluation Endpoint**: p95 $< 50\text{ ms}$.
- **Streaming Update Latency**: $< 50\text{ ms}$ via SSE / WebSocket Pub/Sub stream.

---

## Section 14 — CTO Recommendations & Governance Principles

1. **Streaming Resilience**: Fallback to 30-second polling if SSE/WebSocket streaming drops.
2. **API Compatibility Policy**: Strictly enforce additive-only changes for `/v1/` APIs.
3. **Platform Health Monitoring**: Integrate `/health` endpoint into automated Kubernetes liveness & readiness probes.

---

## Executive Summary & Final CTO Decision

🟢 **MS-22.5 API Contracts & SDK Interfaces Approved with All Refinements**.

The REST API and SDK specification provides deterministic endpoints, SSE/WebSocket streaming, Evaluation Explainability, Platform Health APIs, and a formal API Compatibility Policy for College Hub.

> [!IMPORTANT]
> **MS-22.5 Complete & Approved**. Ready to proceed to **MS-22.6 (Technical Architecture & Blueprint)** when instructed!
