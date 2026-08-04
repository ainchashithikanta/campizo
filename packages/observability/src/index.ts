/**
 * @college-hub/observability — Observability Platform core (MS-55)
 * Prometheus metrics, OpenTelemetry tracing, structured logging correlation and
 * runtime instrumentation helpers for the College Hub platform.
 */

export {
  MetricsRegistry,
  createMetricsRegistry,
  type MetricsRegistryOptions,
  type HistogramOptions
} from './registry.js';
export { createHttpMetrics, type HttpMetrics } from './http-metrics.js';
export { createDbMetrics, type DbMetrics, normalizeSql, hashSql } from './db-metrics.js';
export { createCacheMetrics, type CacheMetrics } from './cache-metrics.js';
export { createJobMetrics, type JobMetrics } from './job-metrics.js';
export { createBusinessMetrics, type BusinessMetrics } from './business-metrics.js';
export { createObservabilityCore, observability, type ObservabilityCore } from './metrics.js';
export {
  initTracing,
  shutdownTracing,
  isTracingEnabled,
  startSpan,
  runInSpan,
  extractTraceContext,
  type SpanHandle,
  type StartSpanOptions,
  type TracingOptions
} from './tracing.js';
export {
  instrumentQueryClient,
  instrumentRedisClient,
  startPoolStatsMonitor,
  withJobMetrics,
  type QueryInstrumentationOptions
} from './instrumentation.js';
export {
  ATTR_HTTP_REQUEST_METHOD,
  ATTR_HTTP_RESPONSE_STATUS_CODE,
  ATTR_HTTP_ROUTE,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION
} from '@opentelemetry/semantic-conventions';
