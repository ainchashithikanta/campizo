# Runbook: Redis Data Loss — RDB Restore

- **ID**: `redis-restore`
- **Severity**: HIGH
- **Trigger**: Redis `dump.rdb` lost/corrupted, volume failure, or a flush
  incident (e.g. `FLUSHALL`) that must be rolled back.

## Context

College Hub uses Redis for caching, sessions and job queues. Sessions and
queues tolerate partial loss (users re-login, jobs re-enqueue); caches rebuild
from PostgreSQL. Restore only what is actually lost — a full RDB restore can
resurrect stale/poisoned data.

## Steps

1. **Confirm scope**: `INFO keyspace` on the affected instance; compare with
   `collegehub_redis_connected`/cache metrics to size the loss.

2. **List snapshots** (retention default: 3 nightly RDBs):

   ```bash
   backup list --kind redis
   ```

3. **Download the chosen snapshot**:

   ```bash
   backup restore-redis --id 2026-08-04T03-00-00.000Z --output /tmp/dump.rdb
   # Redis RDB snapshot <id> downloaded (1234567 bytes). Stop Redis, replace
   # dump.rdb, start Redis.
   ```

4. **Sanity-check the RDB**:

   ```bash
   redis-check-rdb /tmp/dump.rdb
   ```

5. **Swap and restart**:

   ```bash
   redis-cli -a <password> SHUTDOWN NOSAVE        # stop (no new save!)
   mv /tmp/dump.rdb /var/lib/redis/dump.rdb       # replace data file
   systemctl start redis                          # or equivalent
   redis-cli -a <password> INFO keyspace          # confirm keyspace restored
   ```

6. **Drain affected systems**: workers reconnect, sessions re-issue, cache
   warms up (expect a request spike; API HPA absorbs it).

## Escalation

- FLUSHALL after the last RDB snapshot: recovery is bounded by snapshot age
  (≤ 8 h with nightly cadence). Page platform team; consider a second restore
  at a more recent PITR point if the AOF is intact (`INFO persistence`).

## Post-incident

- If the cause was a bad deploy clearing Redis: add a guard to the deploy
  pipeline that refuses `FLUSHALL` in production.
- If the cause was volume loss: move Redis to a PVC-backed StatefulSet (already
  the Helm default) and enable the extra `backup.redis.schedule` for tighter RPO.
