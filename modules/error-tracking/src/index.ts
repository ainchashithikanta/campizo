/**
 * Error Tracking & Incident Response Module (@college-hub/mod-error-tracking) — MS-56
 *
 * Production error tracking without commercial SaaS. The module captures errors
 * from every runtime source, classifies and aggregates them, drives an automatic
 * incident engine, and reports through pluggable providers (console for dev,
 * structured logger, OpenTelemetry events; Sentry/self-hosted can be added
 * later through the same IErrorTransport contract).
 */

import type { FastifyInstance } from 'fastify';
import type { PlatformModule, ModuleManifest, ModuleHealth, EventBus } from '@college-hub/core';
import { logger } from '@college-hub/logger';
import type { ErrorTracker, CaptureContext } from './core/error-tracker.js';
import { registerErrorTrackingRoutes } from './presentation/routes.js';

export * from './domain/entities.js';
export * from './domain/repository.interface.js';
export * from './domain/transport.interface.js';

export * from './application/error-classifier.js';
export * from './application/severity-engine.js';
export * from './application/fingerprint.js';
export * from './application/error-introspection.js';
export * from './application/incident-rules.js';
export * from './application/incident-engine.js';
export * from './application/runbook-catalog.js';

export * from './infrastructure/transports/console-transport.js';
export * from './infrastructure/transports/structured-logger-transport.js';
export * from './infrastructure/transports/otel-transport.js';
export * from './infrastructure/repositories/in-memory-error-tracking.repository.js';

export * from './core/error-tracker.js';
export * from './core/global-handlers.js';
export * from './core/tracker-instance.js';

export * from './presentation/validators.js';
export * from './presentation/controller.js';
export * from './presentation/routes.js';

export interface ErrorTrackingModuleOptions {
  tracker: ErrorTracker;
  enabled?: boolean | undefined;
}

export class ErrorTrackingModule implements PlatformModule {
  public readonly manifest: ModuleManifest = {
    id: 'error-tracking',
    name: 'Error Tracking & Incident Response Module',
    version: '1.0.0',
    minKernelVersion: '1.0.0',
    dependencies: [],
    permissions: ['errors:read', 'errors:write', 'incidents:read', 'incidents:write'],
    routesPrefix: '/errors'
  };

  private readonly tracker: ErrorTracker;
  private readonly enabled: boolean;
  private isStarted = false;

  constructor(options: ErrorTrackingModuleOptions) {
    this.tracker = options.tracker;
    this.enabled = options.enabled ?? true;
  }

  public initialize(app: FastifyInstance, eventBus: EventBus): void {
    if (!this.enabled) {
      logger.info('Error tracking module is disabled; skipping route registration');
      return;
    }

    registerErrorTrackingRoutes(app, { tracker: this.tracker });

    eventBus.subscribe<CaptureContext>('error.tracked', (payload) => {
      if (this.isStarted) {
        this.tracker.capture(payload);
      }
    });

    this.isStarted = true;
    logger.info(`Error tracking module initialized with ${this.tracker.serviceName} service identity`);
  }

  public stop(): void {
    this.isStarted = false;
  }

  public healthCheck(): ModuleHealth {
    const statistics = this.tracker.getErrorsStatistics();
    return {
      moduleId: this.manifest.id,
      status: this.isStarted ? 'ACTIVE' : 'STOPPED',
      healthy: this.isStarted,
      details: {
        enabled: this.enabled,
        trackedErrors: statistics.totalErrors,
        openIncidents: statistics.openIncidents
      }
    };
  }
}

export default ErrorTrackingModule;
