# MS-56 — Incident Lifecycle & Recovery Process

## Lifecycle State Machine

```
              ┌────────────────────────────────────────────┐
              ▼                                            │
 (new) ──► OPEN ──► ACKNOWLEDGED ──► INVESTIGATING ──► RESOLVED ──► CLOSED
              │                                            │
              └──────────── (auto-reopen on new occurrence) ┘
```

| State           | Meaning                                                                    |
| --------------- | -------------------------------------------------------------------------- |
| `OPEN`          | Incident engine matched a rule; nobody has picked it up yet.               |
| `ACKNOWLEDGED`  | Operator acknowledges; `acknowledgedAt`/`acknowledgedBy` recorded.         |
| `INVESTIGATING` | Root-cause work in progress; `investigatingAt`/`investigatingBy` recorded. |
| `RESOLVED`      | Root cause addressed; `resolvedAt`/`resolvedBy` recorded.                  |
| `CLOSED`        | Post-incident review complete; `closedAt`/`closedBy` recorded.             |

Transitions are applied via `PATCH /incidents/:id/status` with
`{ status, actor, note? }`. Every transition is logged with the actor and is
reflected in the incident's audit fields (`*At`/`*By`). Notes are appended to
`incident.notes`.

## Automatic Incident Rules (configurable)

Defined in `modules/error-tracking/src/application/incident-rules.ts`.
`minSeverity` compares against the aggregated error severity; `minOccurrences`
counts captures inside the rolling `windowSeconds`.

| Rule                | Match                      | Severity | Occurrences | Window | Runbook             |
| ------------------- | -------------------------- | -------- | ----------- | ------ | ------------------- |
| `database-outage`   | class=Database             | CRITICAL | 1           | 300s   | database-outage     |
| `redis-outage`      | source=redis               | CRITICAL | 1           | 300s   | redis-outage        |
| `worker-crash-loop` | source=worker              | HIGH     | 3           | 300s   | worker-unavailable  |
| `queue-backlog`     | source=queue               | MEDIUM   | 5           | 300s   | queue-backlog       |
| `api-error-spike`   | source=http                | HIGH     | 5           | 300s   | api-unavailable     |
| `memory-exhaustion` | class=Infrastructure (OOM) | CRITICAL | 1           | 300s   | deployment-rollback |

## Incident Lifecycle Behavior

- **Open**: `IncidentEngine.evaluate` runs on every capture; the first matching
  rule opens the incident with `status: OPEN`, `relatedErrorIds: [errorId]`,
  `runbookRef` from the rule. A `logger.warn` entry and
  `collegehub_error_tracking_incidents_total{severity}` increment accompany it.
- **Refresh (no spam)**: while an incident is open, repeat matches update
  `lastSeenAt`, `occurrenceCount`, `affectedServices` and append the related
  error id. Only one open incident per `(fingerprint, ruleId)`.
- **Acknowledge / Investigate / Resolve / Close**: operator-driven via the
  console (`/admin/error-tracking/incidents/[id]`) or API. The repository
  records the actor and timestamp for each state.
- **Reopen**: a resolved/closed _aggregated error_ that recurs reopens the
  aggregate (OPEN); a new incident is opened for a fresh fingerprint/rule.

## Recovery Process

1. **Detection** — automatic incident appears in the console
   (`/admin/error-tracking/incidents`), Prometheus alert
   (`collegehub_error_tracking_incidents_total`) or health-probe degradation.
2. **Triage** — open the incident, read `runbookRef`, open the matching
   runbook (`docs/runbooks/<id>.md` or the console runbooks page).
3. **Acknowledge** — PATCH status → `ACKNOWLEDGED` (actor + note) so the team
   knows it is owned.
4. **Investigate** — PATCH → `INVESTIGATING`; correlate traceId/spanId in
   Grafana/OTLP, metrics in Prometheus, structured logs by requestId.
5. **Mitigate / Fix** — apply the runbook steps (failover, rollback, scale,
   deploy fix). All evidence stays attached to the incident.
6. **Resolve** — PATCH → `RESOLVED` once the error rate returns to baseline.
7. **Close** — PATCH → `CLOSED` after the post-incident review; notes record
   the final RCA.

## Recovery Automation

- Aggregates auto-reopen, so a recurrence cannot silently hide behind a
  RESOLVED state.
- The incident engine runs in-process on every capture — no separate cron or
  external scheduler is required.
- Worker crash loops, queue backlogs and dependency outages all funnel through
  the same six rules, so operator playbooks stay uniform.
