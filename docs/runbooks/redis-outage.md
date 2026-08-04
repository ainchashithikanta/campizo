# Runbook: Redis Outage Response

- **ID**: `redis-outage`
- **Severity**: CRITICAL
- **Trigger**: `collegehub_error_tracking_incidents_total{rule_id="redis-outage"}` fires (CRITICAL redis-source error captured), or readiness probe failure.

## Symptoms

- Cache misses spike, sessions fail, job queues stall.
- `/health/ready` redis section fails; `collegehub_redis_connected` = 0.
- Incidents `redis-outage` open in the Error Tracking console with
  `ECONNREFUSED`/`ETIMEDOUT` errors from API and worker sources.

## Steps

1. **Confirm scope**: verify Redis connectivity from API and worker pods
   (`kubectl -n collegehub-prod exec deploy/collegehub-api -- redis-cli -h <host> -a <pwd> ping`).
2. **Check the Redis node**: pod health, CPU/memory (OOM kills), recent
   restarts, `maxmemory` policy evictions (`collegehub_redis_commands_total{result="error"}`).
3. **Verify data safety** before any restart: check `INFO persistence` and
   RDB/AOF state. A restart of a replica is safe; a primary restart needs
   failover to a replica with current data.
4. **Fail over / restart** the Redis service.
5. **Watch recovery**: queues re-connect, worker backlog drains; re-queue
   drained jobs if the worker uses Redis and jobs were lost.
6. **Confirm** `collegehub_redis_connected` = 1 and redis health returns OK.
7. **Close the incident**.

## Escalation

- > 10 min: page infrastructure team (ElastiCache/Valkey provider).
- Cache-dependent features degrading: consider feature flags to bypass cache.

## Post-incident

- Check `maxmemory` headroom; add memory alerts if evictions were the cause.
- Verify queue re-delivery configuration (DLQ not silently losing jobs).
