/**
 * Error Tracking & Incident Response — Error Tracker Core (MS-56)
 *
 * The tracker is the composition root of the module: it captures errors from
 * every runtime source (HTTP, worker, Redis, database, health probes, process
 * handlers), classifies them, aggregates repeats by fingerprint, fans out to
 * the configured transports (providers), emits Prometheus metrics through the
 * shared observability registry and drives the automatic incident engine.
 */

import { randomUUID } from 'node:crypto';
import { logger } from '@college-hub/logger';
import { observability, runInSpan } from '@college-hub/observability';
import type {
  ErrorClass,
  ErrorSource,
  IncidentEntity,
  IncidentStatus,
  TrackedErrorEntity
} from '../domain/entities.js';
import type {
  ErrorTrackingQuery,
  ErrorsStatistics,
  IncidentQuery,
  IErrorTrackingRepository,
  PaginatedResult
} from '../domain/repository.interface.js';
import type { IErrorTransport } from '../domain/transport.interface.js';
import { ErrorClassifier } from '../application/error-classifier.js';
import { SeverityEngine } from '../application/severity-engine.js';
import { computeFingerprint } from '../application/fingerprint.js';
import { IncidentEngine } from '../application/incident-engine.js';
import {
  extractErrorCode,
  extractErrorMessage,
  extractErrorName,
  extractStackTrace,
  extractCauseChain,
  safeErrorAttributes
} from '../application/error-introspection.js';

const MAX_RECENT_OCCURRENCES = 100;

export interface CaptureContext {
  source: ErrorSource;
  error: unknown;
  serviceName?: string | undefined;
  moduleId?: string | undefined;
  tenantId?: string | undefined;
  userId?: string | undefined;
  requestId?: string | undefined;
  traceId?: string | undefined;
  spanId?: string | undefined;
  route?: string | undefined;
  method?: string | undefined;
  statusCode?: number | undefined;
  attributes?: Record<string, unknown> | undefined;
}

export interface RequestErrorContext {
  requestId?: string | undefined;
  traceId?: string | undefined;
  tenantId?: string | undefined;
  userId?: string | undefined;
  route?: string | undefined;
  method?: string | undefined;
  statusCode?: number | undefined;
  moduleId?: string | undefined;
}

export interface ErrorTrackerOptions {
  serviceName: string;
  dedupeWindowMs: number;
  transports: IErrorTransport[];
  repository: IErrorTrackingRepository;
  classifier?: ErrorClassifier | undefined;
  severityEngine?: SeverityEngine | undefined;
  incidentEngine?: IncidentEngine | undefined;
  onIncident?: ((incident: IncidentEntity) => void) | undefined;
}

function uniqueServices(a: string[], b: string[]): string[] {
  return Array.from(new Set<string>([...a, ...b])).sort();
}

export class ErrorTracker {
  private readonly classifier: ErrorClassifier;
  private readonly severityEngine: SeverityEngine;
  private readonly incidentEngine: IncidentEngine;
  private readonly errorsCounter;
  private readonly incidentsCounter;

  constructor(private readonly options: ErrorTrackerOptions) {
    this.classifier = options.classifier ?? new ErrorClassifier();
    this.severityEngine = options.severityEngine ?? new SeverityEngine();
    this.incidentEngine = options.incidentEngine ?? new IncidentEngine();
    this.errorsCounter = observability.registry.counter(
      'collegehub_error_tracking_errors_total',
      'Captured and aggregated errors by classification, severity and source',
      ['class', 'severity', 'source']
    );
    this.incidentsCounter = observability.registry.counter(
      'collegehub_error_tracking_incidents_total',
      'Incidents opened by the automatic incident engine',
      ['severity']
    );
  }

  public get serviceName(): string {
    return this.options.serviceName;
  }

  public capture(context: CaptureContext): TrackedErrorEntity {
    const now = new Date();
    const error = context.error;
    const message = extractErrorMessage(error);
    const name = extractErrorName(error);
    const code = extractErrorCode(error);
    const stackTrace = extractStackTrace(error);
    const causeChain = extractCauseChain(error);
    const errorClass = this.classifier.classify({
      error,
      source: context.source,
      statusCode: context.statusCode
    });
    const fingerprint = computeFingerprint({ errorClass, source: context.source, name, message });
    const serviceName = context.serviceName ?? this.options.serviceName;

    const existing = this.options.repository.findAggregate(fingerprint, this.options.dedupeWindowMs);
    const affectedServices = existing ? uniqueServices(existing.affectedServices, [serviceName]) : [serviceName];

    const aggregated = existing
      ? this.aggregate(existing, {
          context,
          errorClass,
          severityInput: {
            errorClass,
            source: context.source,
            statusCode: context.statusCode,
            message,
            occurrenceCount: existing.occurrenceCount + 1
          },
          message,
          name,
          code,
          stackTrace,
          causeChain,
          serviceName,
          affectedServices,
          now
        })
      : this.createNew({
          context,
          errorClass,
          message,
          name,
          code,
          stackTrace,
          causeChain,
          serviceName,
          affectedServices,
          now
        });

    this.options.repository.upsertAggregate(aggregated);
    this.errorsCounter.inc({ class: errorClass, severity: aggregated.severity, source: context.source });

    for (const transport of this.options.transports) {
      try {
        transport.report(aggregated);
      } catch (reportError) {
        logger.error(
          { transport: transport.name, reportError },
          `Error tracking transport '${transport.name}' failed to report an error`
        );
      }
    }

    const incident = this.incidentEngine.evaluate(aggregated, now);
    if (incident !== null) {
      this.recordIncident(incident, aggregated, now);
    }

    return aggregated;
  }

  public async captureWithSpan<T>(
    spanName: string,
    context: Omit<CaptureContext, 'error'>,
    fn: () => Promise<T>
  ): Promise<T> {
    try {
      return await runInSpan(spanName, { attributes: { 'error.source': context.source } }, fn);
    } catch (error) {
      this.capture({ ...context, error });
      throw error;
    }
  }

  public captureRequestError(error: unknown, ctx: RequestErrorContext): TrackedErrorEntity {
    return this.capture({
      source: 'http',
      error,
      statusCode: ctx.statusCode,
      route: ctx.route,
      method: ctx.method,
      moduleId: ctx.moduleId,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      requestId: ctx.requestId,
      traceId: ctx.traceId
    });
  }

  public handleException(error: unknown): TrackedErrorEntity {
    return this.capture({ source: 'unhandled', error });
  }

  public handleUnhandledRejection(reason: unknown): TrackedErrorEntity {
    return this.capture({ source: 'unhandledrejection', error: reason });
  }

  public recordDependencyFailure(
    dependency: 'database' | 'redis' | 'queue' | 'health',
    error: unknown,
    attributes?: Record<string, unknown> | undefined
  ): TrackedErrorEntity {
    return this.capture({ source: dependency, error, attributes });
  }

  public listErrors(query: ErrorTrackingQuery): PaginatedResult<TrackedErrorEntity> {
    return this.options.repository.listErrors(query);
  }

  public getError(id: string): TrackedErrorEntity | null {
    return this.options.repository.getError(id);
  }

  public getErrorsStatistics(): ErrorsStatistics {
    return this.options.repository.getErrorsStatistics();
  }

  public listIncidents(query: IncidentQuery): PaginatedResult<IncidentEntity> {
    return this.options.repository.listIncidents(query);
  }

  public getIncident(id: string): IncidentEntity | null {
    return this.options.repository.getIncident(id);
  }

  public updateIncidentStatus(
    id: string,
    status: IncidentStatus,
    actor: string,
    note?: string | undefined
  ): IncidentEntity | null {
    const updated = this.options.repository.updateIncidentStatus(id, {
      status,
      actor,
      note,
      at: new Date()
    });
    if (updated !== null) {
      logger.info(
        { incidentId: updated.id, status, actor },
        `Incident '${updated.id}' transitioned to ${status} by ${actor}`
      );
    }
    return updated;
  }

  private recordIncident(incident: IncidentEntity, error: TrackedErrorEntity, now: Date): void {
    const existing = this.options.repository.findOpenIncident(incident.fingerprint, incident.ruleId);
    if (existing !== null) {
      const refreshed: IncidentEntity = {
        ...existing,
        lastSeenAt: now,
        occurrenceCount: error.occurrenceCount,
        affectedServices: uniqueServices(existing.affectedServices, error.affectedServices)
      };
      this.options.repository.updateIncident(refreshed);
      this.options.repository.addRelatedError(existing.id, error.id);
      return;
    }
    this.options.repository.createIncident(incident);
    this.options.repository.addRelatedError(incident.id, error.id);
    this.incidentsCounter.inc({ severity: incident.severity });
    this.options.onIncident?.(incident);
    logger.warn(
      {
        incidentId: incident.id,
        ruleId: incident.ruleId,
        severity: incident.severity,
        fingerprint: incident.fingerprint,
        runbookRef: incident.runbookRef
      },
      `Incident opened: ${incident.title}`
    );
  }

  private aggregate(
    existing: TrackedErrorEntity,
    input: {
      context: CaptureContext;
      errorClass: ErrorClass;
      severityInput: Parameters<SeverityEngine['evaluate']>[0];
      message: string;
      name: string;
      code: string | undefined;
      stackTrace: string | undefined;
      causeChain: string[];
      serviceName: string;
      affectedServices: string[];
      now: Date;
    }
  ): TrackedErrorEntity {
    const wasResolved = existing.status === 'RESOLVED' || existing.status === 'CLOSED';
    const recentOccurrences = [...existing.recentOccurrences, input.now].slice(-MAX_RECENT_OCCURRENCES);
    return {
      ...existing,
      severity: this.severityEngine.evaluate(input.severityInput),
      source: input.context.source,
      serviceName: input.serviceName,
      message: existing.message,
      name: existing.name,
      code: existing.code,
      stackTrace: existing.stackTrace,
      causeChain: existing.causeChain,
      moduleId: input.context.moduleId ?? existing.moduleId,
      tenantId: input.context.tenantId ?? existing.tenantId,
      userId: input.context.userId ?? existing.userId,
      requestId: input.context.requestId ?? existing.requestId,
      traceId: input.context.traceId ?? existing.traceId,
      spanId: input.context.spanId ?? existing.spanId,
      route: input.context.route ?? existing.route,
      method: input.context.method ?? existing.method,
      statusCode: input.context.statusCode ?? existing.statusCode,
      attributes: { ...existing.attributes, ...safeErrorAttributes(input.context.attributes) },
      status: wasResolved ? 'OPEN' : existing.status,
      resolvedAt: wasResolved ? undefined : existing.resolvedAt,
      lastSeenAt: input.now,
      occurrenceCount: existing.occurrenceCount + 1,
      affectedServices: input.affectedServices,
      recentOccurrences
    };
  }

  private createNew(input: {
    context: CaptureContext;
    errorClass: ErrorClass;
    message: string;
    name: string;
    code: string | undefined;
    stackTrace: string | undefined;
    causeChain: string[];
    serviceName: string;
    affectedServices: string[];
    now: Date;
  }): TrackedErrorEntity {
    const severity = this.severityEngine.evaluate({
      errorClass: input.errorClass,
      source: input.context.source,
      statusCode: input.context.statusCode,
      message: input.message,
      occurrenceCount: 1
    });
    return {
      id: randomUUID(),
      fingerprint: computeFingerprint({
        errorClass: input.errorClass,
        source: input.context.source,
        name: input.name,
        message: input.message
      }),
      errorClass: input.errorClass,
      severity,
      source: input.context.source,
      serviceName: input.serviceName,
      message: input.message,
      name: input.name,
      code: input.code,
      stackTrace: input.stackTrace,
      causeChain: input.causeChain,
      moduleId: input.context.moduleId,
      tenantId: input.context.tenantId,
      userId: input.context.userId,
      requestId: input.context.requestId,
      traceId: input.context.traceId,
      spanId: input.context.spanId,
      route: input.context.route,
      method: input.context.method,
      statusCode: input.context.statusCode,
      attributes: safeErrorAttributes(input.context.attributes),
      status: 'OPEN',
      firstSeenAt: input.now,
      lastSeenAt: input.now,
      occurrenceCount: 1,
      affectedServices: input.affectedServices,
      recentOccurrences: [input.now],
      resolvedAt: undefined
    };
  }
}
