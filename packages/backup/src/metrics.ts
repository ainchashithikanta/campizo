/**
 * College Hub Backup Platform (MS-57) — backup metrics.
 * Integrated with the shared @college-hub/observability registry so backup
 * outcomes are visible in the existing Prometheus scrape. The WAL forwarder
 * (long-running) can expose these via `serve-metrics`; one-shot CronJobs log
 * a summary line and rely on kube-state-metrics-based alerting.
 */

import type { MetricsRegistry } from '@college-hub/observability';

export type BackupKind = 'postgres' | 'redis' | 'minio';

export interface BackupMetrics {
  jobsTotal: ReturnType<MetricsRegistry['counter']>;
  lastSuccessTimestamp: ReturnType<MetricsRegistry['gauge']>;
  durationSeconds: ReturnType<MetricsRegistry['histogram']>;
  objectsTotal: ReturnType<MetricsRegistry['gauge']>;
  bytesTotal: ReturnType<MetricsRegistry['counter']>;
}

export function createBackupMetrics(registry: MetricsRegistry): BackupMetrics {
  return {
    jobsTotal: registry.counter('collegehub_backup_jobs_total', 'Backup job executions', ['type', 'status']),
    lastSuccessTimestamp: registry.gauge(
      'collegehub_backup_last_success_timestamp_seconds',
      'Unix timestamp of the last successful backup job',
      ['type']
    ),
    durationSeconds: registry.histogram('collegehub_backup_duration_seconds', 'Backup job duration in seconds', {
      buckets: [5, 15, 30, 60, 120, 300, 600, 1800],
      labelNames: ['type']
    }),
    objectsTotal: registry.gauge('collegehub_backup_objects_total', 'Objects stored for a backup type', ['type']),
    bytesTotal: registry.counter('collegehub_backup_bytes_total', 'Bytes uploaded for a backup type', ['type'])
  };
}
