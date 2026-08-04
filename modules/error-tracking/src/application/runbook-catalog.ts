/**
 * Error Tracking & Incident Response — Runbook Catalog (MS-56)
 * Operational runbooks referenced by automatic incidents. Each entry is also
 * documented in depth under docs/runbooks/.
 */

import type { ErrorSeverity, TrackedErrorEntity } from '../domain/entities.js';

export interface RunbookEntry {
  id: string;
  title: string;
  summary: string;
  trigger: string;
  severity: ErrorSeverity;
  steps: string[];
}

export const RUNBOOK_CATALOG: RunbookEntry[] = [
  {
    id: 'database-outage',
    title: 'PostgreSQL Outage Response',
    summary: 'Respond to a database connection outage, failover or degraded queries.',
    trigger: 'collegehub_error_tracking_incidents_total{rule_id="database-outage"} fires.',
    severity: 'CRITICAL',
    steps: [
      'Confirm scope: check /health/ready and collegehub_db_up on all API and worker pods.',
      'Inspect connection pool metrics for exhaustion (collegehub_pg_pool_*).',
      'Check PostgreSQL pod status and recent restarts; verify primary/failover health.',
      'Review slow queries and locks (collegehub_pg_query_duration_seconds).',
      'If using managed RDS, verify maintenance windows and CPU/memory alarms.',
      'Restart the database service or fail over to the standby after verifying data safety.',
      'Confirm /health/ready returns OK on all replicas before closing the incident.'
    ]
  },
  {
    id: 'redis-outage',
    title: 'Redis Outage Response',
    summary: 'Respond to a Redis connectivity failure affecting cache, sessions and queues.',
    trigger: 'collegehub_error_tracking_incidents_total{rule_id="redis-outage"} fires.',
    severity: 'CRITICAL',
    steps: [
      'Confirm scope: check /health/ready redis section and collegehub_redis_connected gauge.',
      'Verify Redis pod health, CPU/memory, and connectivity from API and worker pods.',
      'Inspect Redis error rate (collegehub_redis_commands_total{result="error"}).',
      'Restart the Redis service or fail over to a replica after confirming no data loss risk.',
      'Watch for queue backlog recovery and re-queue drained jobs if the worker uses Redis.',
      'Confirm redis health returns OK before closing the incident.'
    ]
  },
  {
    id: 'worker-unavailable',
    title: 'Worker Unavailable / Crash Loop Response',
    summary: 'Respond to a worker process crash loop or task-handler failures.',
    trigger: 'collegehub_error_tracking_incidents_total{rule_id="worker-crash-loop"} fires.',
    severity: 'HIGH',
    steps: [
      'Check worker pod restarts and recent logs for the crashing task (kubectl logs -l component=worker).',
      'Inspect job failure rate (collegehub_jobs_total{result="error"}) by task name.',
      'Correlate crash-loop errors in the Error Tracking console by worker source.',
      'Roll back the worker deployment to the last known-good image if the crash started after a deploy.',
      'Increase resources or concurrency limits if the crash is resource-induced.',
      'Verify worker readiness and backlog draining before closing the incident.'
    ]
  },
  {
    id: 'queue-backlog',
    title: 'Queue Backlog Response',
    summary: 'Respond to a growing background job backlog and slow consumers.',
    trigger: 'collegehub_error_tracking_incidents_total{rule_id="queue-backlog"} fires.',
    severity: 'MEDIUM',
    steps: [
      'Measure queue depth for the affected queue; identify the stuck task type.',
      'Check consumer health and error rate for that task in Error Tracking.',
      'Scale worker replicas (HPA) or increase worker concurrency for the hot queue.',
      'Investigate downstream dependency failures (DB/Redis/API) causing retries.',
      'If the backlog is from a buggy task, pause enqueueing via feature flag and deploy a fix.',
      'Monitor until the queue returns to steady state.'
    ]
  },
  {
    id: 'api-unavailable',
    title: 'API Unavailable / Error Spike Response',
    summary: 'Respond to a spike of 5xx API errors or an API endpoint outage.',
    trigger: 'collegehub_error_tracking_incidents_total{rule_id="api-error-spike"} fires.',
    severity: 'HIGH',
    steps: [
      'Check the API error rate per route (collegehub_http_requests_total{status_class="5xx"}).',
      'Identify the affected endpoint and correlate with deployments and feature flags.',
      'Inspect Error Tracking console for the error class/stack of the spike.',
      'Roll back the API deployment to the last known-good image if a recent deploy is the cause.',
      'Scale the API (HPA) if the spike is load induced; verify DB/Redis latency.',
      'Confirm the error rate returns to baseline before closing the incident.'
    ]
  },
  {
    id: 'high-latency',
    title: 'High Latency Response',
    summary: 'Respond to P95/P99 latency degradation for API or worker workloads.',
    trigger: 'SLO burn-rate alert or collegehub_http_request_duration_seconds high percentiles.',
    severity: 'MEDIUM',
    steps: [
      'Identify the affected route/service and the latency window (P95 vs P99).',
      'Check DB slow query metrics (collegehub_pg_slow_queries_total) and cache hit ratio.',
      'Verify no queue backlog or connection pool exhaustion.',
      'Check for recent code changes; roll back if a deploy correlates.',
      'Add targeted optimizations (indexes, caching, N+1 fixes) after root-cause analysis.',
      'Monitor the SLO burn-rate window until latency is back under the error budget.'
    ]
  },
  {
    id: 'deployment-rollback',
    title: 'Deployment Rollback Response',
    summary: 'Roll back a bad release safely while preserving incident evidence.',
    trigger: 'Repeated CRITICAL errors, memory exhaustion, or incident detected after a deploy.',
    severity: 'CRITICAL',
    steps: [
      'Freeze new deployments; keep the affected rollout image tag for evidence.',
      'Capture the incident fingerprint and related error IDs from the Error Tracking console.',
      'Roll back API/worker/web to the previous image tag (helm rollback).',
      'Verify /health/ready on all components and monitor error rate recovery.',
      'Triple-check the bad image is not re-promoted by the CI pipeline.',
      'Post-incident: reproduce the failure, fix the defect, and re-run the full test suite.'
    ]
  }
];

export class RunbookCatalog {
  private readonly byId: ReadonlyMap<string, RunbookEntry>;

  constructor(runbooks: RunbookEntry[] = RUNBOOK_CATALOG) {
    this.byId = new Map(runbooks.map((runbook) => [runbook.id, runbook]));
  }

  public getById(id: string): RunbookEntry | null {
    return this.byId.get(id) ?? null;
  }

  /** Best-effort lookup of a runbook for an aggregated error (via rule or class). */
  public findByError(error: TrackedErrorEntity, ruleId?: string | undefined): RunbookEntry | null {
    if (ruleId !== undefined) {
      const byRule = this.byId.get(ruleId);
      if (byRule) {
        return byRule;
      }
    }
    if (error.errorClass === 'Database') {
      return this.byId.get('database-outage') ?? null;
    }
    if (error.source === 'redis') {
      return this.byId.get('redis-outage') ?? null;
    }
    if (error.source === 'worker') {
      return this.byId.get('worker-unavailable') ?? null;
    }
    if (error.source === 'queue') {
      return this.byId.get('queue-backlog') ?? null;
    }
    if (error.source === 'http') {
      return this.byId.get('api-unavailable') ?? null;
    }
    return null;
  }

  public all(): RunbookEntry[] {
    return RUNBOOK_CATALOG;
  }
}
