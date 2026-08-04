/**
 * HTTP request metrics helpers (MS-55).
 * Framework-agnostic: call sites (Fastify plugins, etc.) feed observed values in.
 */

import type { MetricsRegistry } from './registry.js';

const DEFAULT_DURATION_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

export interface HttpMetrics {
  requestStarted(method: string, route: string): void;
  requestFinished(method: string, route: string, statusCode: number, durationMs: number, responseBytes?: number): void;
}

export function createHttpMetrics(registry: MetricsRegistry): HttpMetrics {
  const requestTotal = registry.counter('collegehub_http_requests_total', 'Total HTTP requests handled', [
    'method',
    'route',
    'status'
  ]);
  const requestDuration = registry.histogram('collegehub_http_request_duration_seconds', 'HTTP request duration', {
    labelNames: ['method', 'route'],
    buckets: DEFAULT_DURATION_BUCKETS
  });
  const requestsInFlight = registry.gauge(
    'collegehub_http_requests_in_flight',
    'HTTP requests currently being processed',
    ['method', 'route']
  );
  const responseSize = registry.histogram('collegehub_http_response_size_bytes', 'HTTP response payload size', {
    labelNames: ['method', 'route'],
    buckets: [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 500000]
  });

  return {
    requestStarted(method: string, route: string): void {
      requestsInFlight.inc({ method, route });
    },

    requestFinished(
      method: string,
      route: string,
      statusCode: number,
      durationMs: number,
      responseBytes?: number
    ): void {
      const status = String(statusCode);
      requestTotal.inc({ method, route, status });
      requestDuration.observe({ method, route }, durationMs / 1000);
      requestsInFlight.dec({ method, route });
      if (responseBytes !== undefined) {
        responseSize.observe({ method, route }, responseBytes);
      }
    }
  };
}
