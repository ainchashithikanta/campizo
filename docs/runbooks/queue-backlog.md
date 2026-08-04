# Runbook: Queue Backlog Response

- **ID**: `queue-backlog`
- **Severity**: MEDIUM
- **Trigger**: `collegehub_error_tracking_incidents_total{rule_id="queue-backlog"}` fires (queue-source error repeated 5+ times in 300s), or queue depth alert.

## Symptoms

- `collegehub_jobs_waiting` (or equivalent) grows monotonically.
- The same queue-processing error repeats in the Error Tracking console
  (source `queue`).
- User-visible features that depend on async jobs (notifications, digests,
  resource processing) fall behind.

## Steps

1. **Measure the backlog**: identify the affected queue and the stuck task type
   (job name in the error attributes, queue stats endpoint).
2. **Check consumers**: worker health, error rate for that task in Error
   Tracking; a crashing task makes consumers retry-storm and stall.
3. **Scale up**: temporarily increase worker replicas (HPA may already be
   scaling; check `kubectl get hpa`) or raise per-worker concurrency for the
   hot queue.
4. **Investigate the root cause**: downstream dependency failures (DB/Redis/API)
   causing retries — fix the dependency first, the backlog drains by itself.
5. **Contain a buggy task**: if a code defect is enqueueing failing jobs, pause
   enqueueing via the feature flag kill switch and deploy the fix.
6. **Monitor** until the queue returns to steady state; latency on dependent
   features normalizes.
7. **Close the incident**.

## Escalation

- Backlog older than the job TTL: data loss risk — inform the owning squad and
  restore from the dead-letter queue if available.

## Post-incident

- Add retry budgets and DLQ depth alerts for the affected task type.
- Review the task's idempotency and poison-message handling.
