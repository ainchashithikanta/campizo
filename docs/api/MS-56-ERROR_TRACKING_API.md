# MS-56 — Error Tracking REST API Reference

Base path: served by the API monolith. Routes are registered only when
`ERROR_TRACKING_ENABLED === 'true'`.

All responses use the platform envelope:

```json
{ "success": true, "data": {}, "metadata": { "timestamp": "..." } }
```

Errors:

```json
{ "success": false, "error": { "code": "ERROR_NOT_FOUND", "message": "...", "details": {} } }
```

## GET /errors

Paginated, filterable list of aggregated errors.

Query params:

| Param         | Type   | Description                                                                                            |
| ------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| `errorClass`  | string | One of the 8 error classes                                                                             |
| `severity`    | string | INFO \| LOW \| MEDIUM \| HIGH \| CRITICAL                                                              |
| `source`      | string | http, worker, startup, shutdown, health, unhandled, unhandledrejection, database, redis, queue, module |
| `status`      | string | OPEN \| ACKNOWLEDGED \| INVESTIGATING \| RESOLVED \| CLOSED                                            |
| `serviceName` | string | Exact service name                                                                                     |
| `search`      | string | Substring match on message/service/route                                                               |
| `page`        | number | 1-based (default 1)                                                                                    |
| `limit`       | number | 1–100 (default 20)                                                                                     |

Response `data`:

```json
{
  "items": [{ "TrackedErrorDto": "...see below" }],
  "total": 42,
  "hasMore": true
}
```

`TrackedErrorDto`:

```json
{
  "id": "uuid",
  "fingerprint": "sha1-hex",
  "errorClass": "Database",
  "severity": "CRITICAL",
  "source": "database",
  "serviceName": "college-hub",
  "message": "connect ECONNREFUSED 10.0.0.4:5432",
  "name": "Error",
  "code": "ECONNREFUSED",
  "stackTrace": "...",
  "causeChain": [],
  "moduleId": null,
  "route": null,
  "method": null,
  "statusCode": 500,
  "tenantId": null,
  "userId": null,
  "requestId": "...",
  "traceId": "...",
  "spanId": null,
  "attributes": {},
  "status": "OPEN",
  "firstSeenAt": "ISO-8601",
  "lastSeenAt": "ISO-8601",
  "occurrenceCount": 1,
  "affectedServices": ["college-hub"],
  "resolvedAt": null
}
```

Validation failure → `400 VALIDATION_ERROR` with flattened Zod details.

## GET /errors/statistics

No params. Response `data`:

```json
{
  "totalErrors": 0,
  "openErrors": 0,
  "resolvedErrors": 0,
  "totalIncidents": 0,
  "openIncidents": 0,
  "byClass": {
    "Validation": 0,
    "Infrastructure": 0,
    "Database": 0,
    "Network": 0,
    "Authentication": 0,
    "Authorization": 0,
    "BusinessLogic": 0,
    "Unknown": 0
  },
  "bySeverity": { "INFO": 0, "LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0 },
  "bySource": {},
  "byService": {},
  "affectedServices": []
}
```

## GET /errors/:id

Single aggregated error. `404 ERROR_NOT_FOUND` when unknown.

## GET /incidents

Paginated, filterable list. Query params: `status`, `severity`, `serviceName`,
`page`, `limit` (same semantics as `/errors`).

`IncidentDto`:

```json
{
  "id": "uuid",
  "ruleId": "database-outage",
  "fingerprint": "sha1-hex",
  "title": "PostgreSQL Outage Detected",
  "summary": "...",
  "severity": "CRITICAL",
  "status": "OPEN",
  "source": "database",
  "serviceName": "college-hub",
  "relatedErrorIds": ["uuid"],
  "occurrenceCount": 1,
  "affectedServices": ["college-hub"],
  "firstSeenAt": "ISO-8601",
  "lastSeenAt": "ISO-8601",
  "acknowledgedAt": null,
  "acknowledgedBy": null,
  "investigatingAt": null,
  "investigatingBy": null,
  "resolvedAt": null,
  "resolvedBy": null,
  "closedAt": null,
  "closedBy": null,
  "runbookRef": "database-outage",
  "notes": [],
  "attributes": {}
}
```

## GET /incidents/:id

Single incident. `404 INCIDENT_NOT_FOUND` when unknown.

## PATCH /incidents/:id/status

Transition the lifecycle.

Body:

```json
{ "status": "ACKNOWLEDGED", "actor": "oncall-operator", "note": "owning it" }
```

- `status`: OPEN \| ACKNOWLEDGED \| INVESTIGATING \| RESOLVED \| CLOSED
- `actor`: required non-empty string
- `note`: optional string, appended to `incident.notes`

Returns the updated `IncidentDto`. `404 INCIDENT_NOT_FOUND` for unknown ids;
`400 VALIDATION_ERROR` for invalid bodies.

## Example (curl)

```bash
# List open CRITICAL incidents
curl -s 'http://localhost:4000/incidents?status=OPEN&severity=CRITICAL&limit=5'

# Acknowledge incident 123e4567-e89b-12d3-a456-426614174000
curl -s -X PATCH 'http://localhost:4000/incidents/123e4567-e89b-12d3-a456-426614174000/status' \
  -H 'Content-Type: application/json' \
  -d '{"status":"ACKNOWLEDGED","actor":"oncall-operator","note":"Confirmed outage window"}'
```
