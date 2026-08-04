/**
 * Cache (Redis) metrics helpers (MS-55).
 */

import type { MetricsRegistry } from './registry.js';

export interface CacheMetrics {
  observeCommand(command: string, durationMs: number, ok: boolean): void;
  setConnected(connected: boolean): void;
}

export function createCacheMetrics(registry: MetricsRegistry): CacheMetrics {
  const commandsTotal = registry.counter('collegehub_redis_commands_total', 'Redis commands issued', ['command']);
  const commandDuration = registry.histogram('collegehub_redis_command_duration_seconds', 'Redis command duration', {
    labelNames: ['command'],
    buckets: [0.0005, 0.001, 0.0025, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1]
  });
  const errorsTotal = registry.counter('collegehub_redis_errors_total', 'Failed Redis commands');
  const connected = registry.gauge(
    'collegehub_cache_connected',
    'Cache connectivity (1 = connected, 0 = disconnected)'
  );

  return {
    observeCommand(command: string, durationMs: number, ok: boolean): void {
      commandsTotal.inc({ command });
      commandDuration.observe({ command }, durationMs / 1000);
      if (!ok) {
        errorsTotal.inc();
      }
    },

    setConnected(value: boolean): void {
      connected.set(value ? 1 : 0);
    }
  };
}
