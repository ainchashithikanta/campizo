# Runbook: API Unavailable / Error Spike Response

- **ID**: `api-unavailable`
- **Severity**: HIGH
- **Trigger**: `collegehub_error_tracking_incidents_total{rule_id="api-error-spike"}` fires (same HTTP error repeated 5+ times in 300s at HIGH+), or 5xx rate SLO burn.

## Symptoms

- `collegehub_http_requests_total{status_class="5xx"}` spikes.
- Repeated identical HTTP errors in the Error Tracking console (source `http`).
- Users report failures; SLO burn-rate alert for availability.

## Steps

1. **Check the error rate per route**:
   `collegehub_http_requests_total{status_class="5xx"}` by route/method —
   isolate the affected endpoint.
2. **Correlate**: deployments (release time vs. spike start), feature flags
   (recent rollouts), and dependency health (DB/Redis latency).
3. **Inspect the console**: open the related error in
   `/admin/error-tracking/errors` — class, stack, traceId for the exact
   failing code path.
4. **Roll back** the API deployment to the last known-good image if a recent
   deploy correlates (`helm rollback collegehub <n>`).
5. **Scale if load-induced**: let HPA scale out, verify DB/Redis latency is
   not the bottleneck, check pool exhaustion metrics.
6. **Confirm baseline**: error rate returns to normal across all routes.
7. **Close the incident**.

## Escalation

- Availability SLO burn: page the squad owning the endpoint; consider
  degrading non-critical features via feature flags.

## Post-incident

- Capture the fingerprint + related error IDs as evidence.
- Reproduce the failing request in staging with the same trace context.
