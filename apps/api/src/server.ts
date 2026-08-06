import Fastify, { type FastifyInstance } from 'fastify';
import { pathToFileURL } from 'node:url';
import { loadEnv } from '@college-hub/config';
import { logger, setupProcessErrorHandler } from '@college-hub/logger';
import { DynamicModuleRegistry, InMemoryEventBus } from '@college-hub/core';
import { RateMyProfessorModule } from '@college-hub/mod-rate-my-professor';
import {
  ErrorTrackingModule,
  bootstrapErrorTracking,
  clearErrorTrackerInstance,
  createDefaultTransports,
  InMemoryErrorTrackingRepository
} from '@college-hub/mod-error-tracking';
import {
  observability,
  initTracing,
  shutdownTracing,
  instrumentQueryClient,
  startPoolStatsMonitor
} from '@college-hub/observability';
import { gatewayPipelinePlugin } from './plugins/pipeline.plugin.js';
import { observabilityPlugin } from './plugins/observability.plugin.js';
import { ApiHealthProbes, registerHealthProbes } from './health.js';
import { registerFeatureModules } from './modules.registry.js';

export async function buildApp(): Promise<FastifyInstance> {
  const serviceName = process.env.SERVICE_NAME ?? 'college-hub';
  const environment = process.env.NODE_ENV ?? 'production';

  observability.configure({ serviceName, environment });

  const tracingOptions: { enabled: boolean; serviceName: string; environment: string; endpoint?: string } = {
    enabled: process.env.OTEL_TRACES_ENABLED === 'true',
    serviceName,
    environment
  };
  const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (otelEndpoint !== undefined) {
    tracingOptions.endpoint = otelEndpoint;
  }
  initTracing(tracingOptions);

  const app = Fastify({
    logger: false, // Managed by @college-hub/logger
    disableRequestLogging: true
  });

  const eventBus = new InMemoryEventBus();
  const moduleRegistry = new DynamicModuleRegistry();
  const healthProbes = new ApiHealthProbes({
    startupCheck: async () =>
      moduleRegistry.getRegisteredModules().every((id) => moduleRegistry.getModuleStatus(id) === 'ACTIVE'),
    onPoolCreated: (pool) => {
      instrumentQueryClient(pool, observability.db);
      startPoolStatsMonitor(pool, observability.db);
    }
  });
  healthProbes.registerChecker(() => healthProbes.checkDatabase());

  // Register Gateway Security Pipeline Plugin
  await app.register(gatewayPipelinePlugin);

  // Register Observability Plugin (HTTP metrics, tracing spans, /metrics endpoint)
  await app.register(observabilityPlugin);

  // Bootstrap Error Tracking & Incident Response (MS-56)
  if (process.env.ERROR_TRACKING_ENABLED === 'true') {
    const tracker = bootstrapErrorTracking({
      serviceName,
      dedupeWindowMs: Number(process.env.ERROR_TRACKING_DEDUPE_WINDOW_MS ?? 86_400_000),
      transports: createDefaultTransports(),
      repository: new InMemoryErrorTrackingRepository()
    });
    moduleRegistry.register(new ErrorTrackingModule({ tracker }));
  }

  // Register Canonical Feature Modules
  moduleRegistry.register(new RateMyProfessorModule());
  await moduleRegistry.initializeAll(app, eventBus);

  // Register all feature module REST APIs (confessions, connect, marketplace,
  // academic-resources, notifications, placement-guidance)
  await registerFeatureModules(app, eventBus);

  // Root route (200) so the service root is browsable
  app.get('/', async () => ({
    success: true,
    data: {
      service: 'College Hub API',
      status: 'online',
      version: process.env.CONFIG_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      uptime: Math.floor(process.uptime()),
      docs: {
        health: '/health',
        metrics: '/metrics'
      }
    }
  }));

  // Kubernetes Liveness, Readiness, Startup & Health Probes
  registerHealthProbes(app, healthProbes);

  // Release module resources, lazy connection pools and tracing SDK on shutdown
  app.addHook('onClose', async () => {
    await moduleRegistry.stopAll();
    await healthProbes.close();
    await shutdownTracing();
    clearErrorTrackerInstance();
  });

  return app;
}

async function bootstrap() {
  const env = loadEnv();
  setupProcessErrorHandler(logger);
  const app = await buildApp();

  const shutdown = (signal: NodeJS.Signals): void => {
    logger.info({ signal }, 'Received shutdown signal. Draining connections gracefully...');
    const forceExitTimer = setTimeout(() => {
      logger.fatal('Graceful shutdown timed out. Forcing process exit.');
      process.exit(1);
    }, env.GRACEFUL_SHUTDOWN_TIMEOUT_MS);
    forceExitTimer.unref();

    void app
      .close()
      .then(() => {
        logger.info('Application closed cleanly after graceful shutdown.');
        process.exit(0);
      })
      .catch((err) => {
        logger.error({ err }, 'Error during graceful shutdown.');
        process.exit(1);
      });
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));

  try {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : env.PORT;
    const host = process.env.HOST || env.HOST || '0.0.0.0';
    await app.listen({ port, host });
    logger.info(`🚀 College Hub API Monolith Server running at http://${host}:${port}`);
  } catch (err) {
    logger.fatal({ err }, 'Failed to start Fastify server');
    process.exit(1);
  }
}

const entryPath = process.argv[1];
if (process.env['NODE_ENV'] !== 'test' && entryPath !== undefined && pathToFileURL(entryPath).href === import.meta.url) {
  bootstrap();
}
