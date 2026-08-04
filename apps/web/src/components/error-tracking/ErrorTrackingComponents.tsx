'use client';

import React from 'react';
import Link from 'next/link';
import type { ErrorSeverity, IncidentStatus, ErrorClass } from '@web/lib/api-error-tracking';
import '@web/styles/error-tracking.css';

/**
 * Navigation Header for the Error Tracking & Incident Response Console (MS-56).
 */
export function ErrorTrackingNavHeader({ activePath }: { activePath: string }) {
  const links = [
    { href: '/admin/error-tracking', label: 'Dashboard' },
    { href: '/admin/error-tracking/errors', label: 'Errors' },
    { href: '/admin/error-tracking/incidents', label: 'Incidents' }
  ];

  return (
    <nav className="et-nav-grid" aria-label="Error Tracking Console Navigation">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className={`et-nav-link ${activePath === link.href ? 'active' : ''}`}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Metric card used by the dashboard statistics grid.
 */
export function MetricCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <div className="et-metric-box">
      <div className="et-metric-title">{title}</div>
      <div className="et-metric-val">{value}</div>
      {subtitle && <div className="et-metric-sub">{subtitle}</div>}
    </div>
  );
}

const SEVERITY_CLASSES: Record<ErrorSeverity, string> = {
  INFO: 'et-badge-info',
  LOW: 'et-badge-low',
  MEDIUM: 'et-badge-medium',
  HIGH: 'et-badge-high',
  CRITICAL: 'et-badge-critical'
};

/**
 * Color-coded severity pill. Severity colors are chosen for WCAG 2.2 AA
 * contrast against the dark surface (never color-only semantics; text is always
 * included).
 */
export function SeverityBadge({ severity }: { severity: ErrorSeverity }) {
  return <span className={`et-badge ${SEVERITY_CLASSES[severity]}`}>{severity}</span>;
}

const STATUS_CLASSES: Record<IncidentStatus, string> = {
  OPEN: 'et-badge-open',
  ACKNOWLEDGED: 'et-badge-acknowledged',
  INVESTIGATING: 'et-badge-investigating',
  RESOLVED: 'et-badge-resolved',
  CLOSED: 'et-badge-closed'
};

/**
 * Color-coded lifecycle status pill.
 */
export function StatusBadge({ status }: { status: IncidentStatus }) {
  return <span className={`et-badge ${STATUS_CLASSES[status]}`}>{status}</span>;
}

const CLASS_CLASSES: Record<ErrorClass, string> = {
  Validation: 'et-badge-class-validation',
  Infrastructure: 'et-badge-class-infrastructure',
  Database: 'et-badge-class-database',
  Network: 'et-badge-class-network',
  Authentication: 'et-badge-class-authentication',
  Authorization: 'et-badge-class-authorization',
  BusinessLogic: 'et-badge-class-business',
  Unknown: 'et-badge-class-unknown'
};

/**
 * Color-coded classification pill.
 */
export function ClassBadge({ errorClass }: { errorClass: ErrorClass }) {
  return <span className={`et-badge ${CLASS_CLASSES[errorClass]}`}>{errorClass}</span>;
}

/**
 * Inline loading placeholder.
 */
export function LoadingState({ label }: { label: string }) {
  return (
    <div className="et-state-panel" role="status" aria-live="polite">
      <span className="et-spinner" aria-hidden="true" />
      <span>Loading {label}...</span>
    </div>
  );
}

/**
 * Error panel with a retry action. Shown when the console cannot reach the API.
 */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="et-state-panel et-state-error" role="alert">
      <span className="et-state-error-icon" aria-hidden="true">
        &#9888;
      </span>
      <div>
        <div className="et-state-error-title">Console unavailable</div>
        <div className="et-state-error-message">{message}</div>
      </div>
      <button type="button" className="et-btn-secondary" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

/**
 * Humanized timestamp helper (ISO string to local date/time).
 */
export function formatTimestamp(iso: string | undefined): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString();
}

/**
 * Pagination controls with explicit prev/next actions and result summary.
 */
export function PaginationBar({
  page,
  total,
  pageSize,
  hasMore,
  onPageChange
}: {
  page: number;
  total: number;
  pageSize: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
}) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return (
    <div className="et-pagination">
      <span className="et-pagination-summary">
        Showing {first}–{last} of {total}
      </span>
      <div className="et-pagination-actions">
        <button type="button" className="et-btn-secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          &#8592; Previous
        </button>
        <button type="button" className="et-btn-secondary" disabled={!hasMore} onClick={() => onPageChange(page + 1)}>
          Next &#8594;
        </button>
      </div>
    </div>
  );
}

/**
 * Runbook catalog rendered by the console. Canonical deep documentation lives
 * under docs/runbooks/ (one file per runbook id).
 */
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
