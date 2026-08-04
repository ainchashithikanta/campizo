/**
 * Background job / worker metrics helpers (MS-55).
 */

import type { MetricsRegistry } from './registry.js';

export interface JobMetrics {
  jobStarted(job: string): void;
  jobFinished(job: string, ok: boolean, durationMs: number): void;
}

export function createJobMetrics(registry: MetricsRegistry): JobMetrics {
  const jobsTotal = registry.counter('collegehub_jobs_total', 'Background jobs executed', ['job', 'result']);
  const jobDuration = registry.histogram('collegehub_job_duration_seconds', 'Background job duration', {
    labelNames: ['job'],
    buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30]
  });
  const jobsInFlight = registry.gauge('collegehub_jobs_in_flight', 'Background jobs currently running', ['job']);

  return {
    jobStarted(job: string): void {
      jobsInFlight.inc({ job });
    },

    jobFinished(job: string, ok: boolean, durationMs: number): void {
      jobsTotal.inc({ job, result: ok ? 'success' : 'failure' });
      jobDuration.observe({ job }, durationMs / 1000);
      jobsInFlight.dec({ job });
    }
  };
}
