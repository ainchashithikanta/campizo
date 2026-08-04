# Runbook: High Latency Response

- **ID**: `high-latency`
- **Severity**: MEDIUM
- **Trigger**: SLO burn-rate alert for latency, or
  `collegehub_http_request_duration_seconds` P95/P99 exceeding the SLO budget.

## Symptoms

- P95/P99 latency degrades on API routes or worker processing time.
- Slow-query metrics rise (`collegehub_pg_slow_queries_total`).
- Users perceive slowness even while error rates stay normal.

## Steps

1. **Isolate**: identify affected route/service and the latency window
   (P95 vs P99) from the API HTTP dashboard.
2. **Check the database**: slow queries, locks, connection pool wait time;
   an expensive query change is the most common cause.
3. **Check the cache**: hit ratio (`collegehub_redis_commands_total`),
   evictions — a cold cache amplifies latency.
4. **Check saturation**: queue backlog, pool exhaustion, CPU/GC pressure
   (`collegehub_jvm_*`/process metrics).
5. **Correlate with deploys**: roll back if a release correlates with the
   regression.
6. **Remediate**: add indexes, increase cache TTL/capacity, fix N+1 queries —
   after root-cause analysis, not reactively.
7. **Monitor** the SLO burn-rate window until latency is back under the error
   budget.

## Escalation

- Latency breach > 1 error-budget window: treat as SEV-2, involve the owning
  squad and the DB admin.

## Post-incident

- Add a latency regression test (load profile) for the affected route.
- Update capacity plans if the degradation was scale-related.
