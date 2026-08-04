# Runbook: Deployment Rollback Response

- **ID**: `deployment-rollback`
- **Severity**: CRITICAL
- **Trigger**: Repeated CRITICAL errors, memory exhaustion incident
  (`memory-exhaustion` rule), or incident detected immediately after a deploy.

## Symptoms

- New errors/incidents appear right after a release window.
- `memory-exhaustion` incident (`out of memory` / heap limit) with
  `deployment-rollback` runbook reference.
- Error rate or latency jumps correlate exactly with the release time.

## Steps

1. **Freeze the pipeline**: stop new deployments and CI promotions of the
   affected image. Keep the bad image tag for evidence — never overwrite it.
2. **Capture evidence**: record the incident fingerprint, related error IDs and
   the failing stack from the Error Tracking console
   (`/admin/error-tracking/incidents/<id>`, `/errors`).
3. **Roll back**: `helm rollback collegehub <previous-revision>` for the
   affected component(s) (api/worker/web). Verify the previous image tag is
   the one actually being restored.
4. **Verify recovery**: `/health/ready` on all components, error rate back to
   baseline, no new incidents opening.
5. **Guarantee non-repromotion**: triple-check the CI pipeline cannot re-promote
   the bad image (tag pinning, rollback guard).
6. **Post-incident**: reproduce the failure locally, fix the defect, add a
   regression test, and re-run the full test suite (`pnpm lint`, `pnpm test`,
   `pnpm verify`) before a new release.

## Escalation

- Memory exhaustion across replicas: also check OOMKilled events and resource
  limits; the fix may need both a rollback and a limit adjustment.

## Post-incident

- Document the RCA in the incident notes.
- Add a release-gating check (canary + smoke tests) so the same class of
  failure is caught pre-promotion next time.
