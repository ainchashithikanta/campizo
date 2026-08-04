# Runbook: Worker Unavailable / Crash Loop Response

- **ID**: `worker-unavailable`
- **Severity**: HIGH
- **Trigger**: `collegehub_error_tracking_incidents_total{rule_id="worker-crash-loop"}` fires (same worker task failed 3+ times in 300s).

## Symptoms

- Worker pod restarts climbing; `kubectl get pods` shows `CrashLoopBackOff`.
- Same task failing repeatedly in the Error Tracking console (source `worker`).
- Queue depth grows; consumers stall.

## Steps

1. **Check the crash loop**: `kubectl -n collegehub-prod logs -l component=worker --tail=200`
   and `kubectl -n collegehub-prod get pods -l component=worker` (restart counts).
2. **Identify the task**: `collegehub_jobs_total{result="error"}` by task name;
   cross-reference the failing task in the Error Tracking console.
3. **Correlate with deploys**: if restarts started after a release, roll the
   worker back to the last known-good image (`helm rollback collegehub <n>`).
4. **Check resources**: OOM kills (`lastState.terminated.reason == OOMKilled`)
   → increase worker memory limits or reduce concurrency.
5. **Verify backlog draining** after recovery; readiness probe returns OK.
6. **Close the incident** when the restart rate returns to zero.

## Escalation

- > 30 min: involve the owning squad; consider pausing task enqueueing via
  > feature flag while the fix ships.

## Post-incident

- Reproduce the crash locally; add a regression test for the failing task.
- Tune HPA/concurrency if the crash was resource-induced.
