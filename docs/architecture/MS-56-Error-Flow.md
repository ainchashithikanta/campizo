# MS-56 — Error Flow

End-to-end journey of a failure from the moment it happens until it is
visible in the console and reported to the configured providers.

## Pipeline

```
 Failure occurs (HTTP 5xx, job failure, DB/Redis outage, OOM, ...)
        │
        ▼
 Capture site (pipeline plugin, worker runtime, health checks,
 installProcessErrorHandlers, module code calling tracker.capture)
        │
        ▼
 ErrorTracker.capture(context)
   ├─ extract  name / message / code / stackTrace / causeChain
   ├─ classify → ErrorClassifier (8 classes)
   ├─ fingerprint → sha1(class|source|name|normalizedMessage)
   ├─ repository.findAggregate(fingerprint, dedupeWindowMs)
   │    ├─ exists → aggregate (count++, lastSeen, services, severity escalation)
   │    └─ new    → create aggregate (firstSeen = now, count = 1)
   ├─ repository.upsertAggregate
   ├─ metrics → collegehub_error_tracking_errors_total{class,severity,source}
   ├─ transports → console | structured | otel (report(event))
   └─ IncidentEngine.evaluate(aggregate, now)
        └─ rule match in rolling window → incident (see lifecycle doc)
```

## Capture Context

`ErrorTracker.capture` accepts a `CaptureContext`:

```ts
{
  source: 'http' | 'worker' | 'startup' | 'shutdown' | 'health'
        | 'unhandled' | 'unhandledrejection' | 'database'
        | 'redis' | 'queue' | 'module';
  error: unknown;
  serviceName?, moduleId?, tenantId?, userId?, requestId?,
  traceId?, spanId?, route?, method?, statusCode?, attributes?
}
```

Trace/tenant/user fields are passed from the request pipeline so every
aggregated error is correlatable with OTLP spans and structured logs.

## Aggregation & Deduplication

- Fingerprint ignores transient details: normalized message (lowercased,
  numbers/uuids normalized), error class, source, error name.
- Aggregation window (`dedupeWindowMs`, default 86 400 000 ms / 24 h) is
  evaluated per capture: repeats beyond the window create a new aggregate.
- `recentOccurrences` keeps the last 100 timestamps and drives both severity
  escalation and incident window evaluation.
- A RESOLVED or CLOSED aggregate reopens (status → OPEN) when a new occurrence
  arrives — the same bug reappearing becomes visible again.

## Classification Signal Path

```
classify({ error, source, statusCode }) →
  message/name/code keywords + Node error code prefixes +
  source + statusCode heuristics →
  Validation | Infrastructure | Database | Network | Authentication
  | Authorization | BusinessLogic | Unknown
```

## Severity Escalation Path

```
severity = base(class, source, message)
if occurrenceCount >= 10 → +2 levels
else if occurrenceCount >= 5 → +1 level
(capped at CRITICAL)
```

## Incident Evaluation Path

For each incident rule (class/source matcher, minSeverity, minOccurrences,
windowSeconds):

```
occurrencesInWindow = count(recentOccurrences within windowSeconds*1000)
if occurrencesInWindow >= minOccurrences → open (or refresh) incident
```

Only one open incident per `(fingerprint, ruleId)` — repeat matches refresh
`lastSeenAt`, `occurrenceCount` and `affectedServices` instead of spamming.

## Observability Correlation

| System          | Identifier on the error                |
| --------------- | -------------------------------------- |
| OTLP traces     | `traceId`, `spanId`                    |
| Structured logs | `requestId` (and logger context)       |
| Prometheus      | `collegehub_error_tracking_*` counters |
| Console         | `requestId` + `attributes`             |
| Runbooks        | `runbookRef` on incidents              |

## Failure Containment

- Transport failures never break the capture pipeline (try/catch + log).
- The tracker never throws into request handling; API responses keep the
  platform envelope.
- Provider abstraction means a broken provider can be disabled via
  `ERROR_TRACKING_TRANSPORTS` without code changes.
