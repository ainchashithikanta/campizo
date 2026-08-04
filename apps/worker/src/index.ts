import { loadEnv } from '@college-hub/config';
import { logger } from '@college-hub/logger';
import {
  bootstrapErrorTracking,
  clearErrorTrackerInstance,
  createDefaultTransports,
  InMemoryErrorTrackingRepository,
  installProcessErrorHandlers
} from '@college-hub/mod-error-tracking';
import { observability, initTracing, shutdownTracing } from '@college-hub/observability';
import { WorkerRuntime } from './runtime.js';
import { startHealthServer } from './http.js';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const serviceName = env.SERVICE_NAME || 'college-hub-worker';
  const healthPort = env.WORKER_HEALTH_PORT ?? 4100;
  const runtime = new WorkerRuntime(env);

  observability.configure({ serviceName, environment: env.NODE_ENV });

  const tracingOptions: { enabled: boolean; serviceName: string; environment: string; endpoint?: string } = {
    enabled: env.OTEL_TRACES_ENABLED,
    serviceName,
    environment: env.NODE_ENV
  };
  if (env.OTEL_EXPORTER_OTLP_ENDPOINT !== undefined) {
    tracingOptions.endpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT;
  }
  initTracing(tracingOptions);

  // Bootstrap Error Tracking & Incident Response (MS-56)
  let processHandlers: ReturnType<typeof installProcessErrorHandlers> | undefined;
  if (process.env.ERROR_TRACKING_ENABLED === 'true') {
    const tracker = bootstrapErrorTracking({
      serviceName,
      dedupeWindowMs: Number(process.env.ERROR_TRACKING_DEDUPE_WINDOW_MS ?? 86_400_000),
      transports: createDefaultTransports(),
      repository: new InMemoryErrorTrackingRepository()
    });
    processHandlers = installProcessErrorHandlers(tracker);
  }

  await runtime.start();
  const server = await startHealthServer(runtime, healthPort);

  const shutdown = (signal: NodeJS.Signals): void => {
    logger.info({ signal }, 'Worker received shutdown signal. Draining and closing connections...');
    const forceExitTimer = setTimeout(() => {
      logger.fatal('Worker graceful shutdown timed out. Forcing process exit.');
      process.exit(1);
    }, env.GRACEFUL_SHUTDOWN_TIMEOUT_MS);
    forceExitTimer.unref();

    void (async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await runtime.stop();
      await shutdownTracing();
      processHandlers?.dispose();
      clearErrorTrackerInstance();
      clearTimeout(forceExitTimer);
      logger.info('Worker runtime closed cleanly after graceful shutdown.');
      process.exit(0);
    })();
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));

  logger.info(`🚀 College Hub background worker runtime running (health on :${healthPort})`);
}

if (process.env['NODE_ENV'] !== 'test' && import.meta.url === `file://${process.argv[1]}`) {
  bootstrap();
}
