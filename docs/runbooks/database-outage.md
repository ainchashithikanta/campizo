# Runbook: PostgreSQL Outage Response

- **ID**: `database-outage`
- **Severity**: CRITICAL
- **Trigger**: `collegehub_error_tracking_incidents_total{rule_id="database-outage"}` fires (CRITICAL database-class error captured), or readiness probe failure on `/health/ready`.

## Symptoms

- API returns 5xx with `connect ECONNREFUSED` / `timeout` on the pg pool.
- `/health/ready` reports database check failure.
- `collegehub_db_up` gauge drops to 0.
- Incident `database-outage` opens in the Error Tracking console.

## Steps

1. **Confirm scope**: check `/health/ready` on all API and worker pods
   (`kubectl -n collegehub-prod exec deploy/collegehub-api -- wget -qO- localhost:4000/health/ready`).
   Verify `collegehub_db_up` per pod in Prometheus.
2. **Inspect the pool**: `collegehub_pg_pool_*` metrics for exhaustion
   (max clients reached, high wait time) — distinguish "DB is down" from
   "pool is exhausted".
3. **Check the database**: pod status, restarts (`kubectl -n collegehub-prod get pods -l app.kubernetes.io/name=collegehub`),
   primary/failover health. For managed RDS: console alarms, maintenance window, CPU/memory.
4. **Review queries**: `collegehub_pg_query_duration_seconds` and slow-query
   logs for lock contention or a runaway query.
5. **Restart / failover**: restart the DB service or fail over to the standby
   **after verifying no data loss risk** (check WAL/replication lag first).
6. **Verify recovery**: `/health/ready` returns OK on all replicas; the error
   rate returns to baseline.
7. **Close the incident** only after 5 minutes of clean health.

## Escalation

- > 15 min: page DB/cloud provider on-call.
- Data loss suspected: freeze writes, preserve evidence (logs, pool metrics).

## Post-incident

- Record RCA in the incident notes; check for pool size tuning
  (`collegehub_pg_pool_max`), connection leak fixes, and replica promotion drill.
