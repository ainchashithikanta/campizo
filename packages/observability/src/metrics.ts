/**
 * Central observability bundle (MS-55).
 * Exposes a single shared registry plus framework-agnostic metric facades, and a
 * process-wide default instance (`observability`) that applications can
 * configure with their service name at bootstrap.
 */

import { createMetricsRegistry, type MetricsRegistry, type MetricsRegistryOptions } from './registry.js';
import { createHttpMetrics, type HttpMetrics } from './http-metrics.js';
import { createDbMetrics, type DbMetrics } from './db-metrics.js';
import { createCacheMetrics, type CacheMetrics } from './cache-metrics.js';
import { createJobMetrics, type JobMetrics } from './job-metrics.js';
import { createBusinessMetrics, type BusinessMetrics } from './business-metrics.js';

export interface ObservabilityCore {
  registry: MetricsRegistry;
  http: HttpMetrics;
  db: DbMetrics;
  cache: CacheMetrics;
  jobs: JobMetrics;
  business: BusinessMetrics;
  configure(options: { serviceName?: string; environment?: string }): void;
}

export function createObservabilityCore(options: MetricsRegistryOptions = {}): ObservabilityCore {
  const registry = createMetricsRegistry(options);
  return {
    registry,
    http: createHttpMetrics(registry),
    db: createDbMetrics(registry),
    cache: createCacheMetrics(registry),
    jobs: createJobMetrics(registry),
    business: createBusinessMetrics(registry),
    configure: (config) => registry.configure(config)
  };
}

/** Process-wide default instance. Applications call `observability.configure(...)` at bootstrap. */
export const observability: ObservabilityCore = createObservabilityCore({
  serviceName: process.env.SERVICE_NAME ?? 'college-hub',
  environment: process.env.NODE_ENV ?? 'development'
});
