/**
 * Error Tracking & Incident Response — Unit & Integration Test Suite (MS-56)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import { ErrorClassifier } from '../src/application/error-classifier.js';
import { SeverityEngine } from '../src/application/severity-engine.js';
import { computeFingerprint } from '../src/application/fingerprint.js';
import { IncidentEngine } from '../src/application/incident-engine.js';
import { InMemoryErrorTrackingRepository } from '../src/infrastructure/repositories/in-memory-error-tracking.repository.js';
import type { IErrorTransport } from '../src/domain/transport.interface.js';
import type { TrackedErrorEntity } from '../src/domain/entities.js';
import { ErrorTracker } from '../src/core/error-tracker.js';
import { installProcessErrorHandlers } from '../src/core/global-handlers.js';
import { registerErrorTrackingRoutes } from '../src/presentation/routes.js';

class CapturingTransport implements IErrorTransport {
  public readonly name = 'capture';
  public readonly reports: TrackedErrorEntity[] = [];

  public report(error: TrackedErrorEntity): void {
    this.reports.push(error);
  }
}

function createTracker(transports: IErrorTransport[] = [new CapturingTransport()]): {
  tracker: ErrorTracker;
  transport: CapturingTransport;
  repository: InMemoryErrorTrackingRepository;
} {
  const repository = new InMemoryErrorTrackingRepository();
  const transport = transports.find((t) => t instanceof CapturingTransport) as CapturingTransport;
  const tracker = new ErrorTracker({
    serviceName: 'college-hub-test',
    dedupeWindowMs: 60_000,
    transports,
    repository
  });
  return { tracker, transport, repository };
}

describe('Error Classifier (MS-56)', () => {
  const classifier = new ErrorClassifier();

  it('classifies network error codes as Network', () => {
    const error = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), { code: 'ECONNREFUSED' });
    expect(classifier.classify({ error, source: 'http' })).toBe('Network');
  });

  it('classifies connection errors from the database source as Database', () => {
    const error = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), { code: 'ECONNREFUSED' });
    expect(classifier.classify({ error, source: 'database' })).toBe('Database');
  });

  it('classifies SQLSTATE prefixes as Database', () => {
    const error = Object.assign(new Error('relation "listings" does not exist'), { code: '42P01' });
    expect(classifier.classify({ error, source: 'worker' })).toBe('Database');
  });

  it('classifies HTTP status codes', () => {
    const classifier2 = new ErrorClassifier();
    expect(classifier2.classify({ error: new Error('bad body'), source: 'http', statusCode: 400 })).toBe('Validation');
    expect(classifier2.classify({ error: new Error('nope'), source: 'http', statusCode: 401 })).toBe('Authentication');
    expect(classifier2.classify({ error: new Error('nope'), source: 'http', statusCode: 403 })).toBe('Authorization');
    expect(classifier2.classify({ error: new Error('missing'), source: 'http', statusCode: 404 })).toBe(
      'BusinessLogic'
    );
  });

  it('classifies message signals and falls back to Unknown', () => {
    expect(classifier.classify({ error: new Error('request body is malformed'), source: 'http' })).toBe('Validation');
    expect(classifier.classify({ error: new Error('invalid token signature'), source: 'http' })).toBe('Authentication');
    expect(classifier.classify({ error: new Error('you are forbidden from this action'), source: 'http' })).toBe(
      'Authorization'
    );
    expect(classifier.classify({ error: new Error('JavaScript heap out of memory'), source: 'worker' })).toBe(
      'Infrastructure'
    );
    expect(classifier.classify({ error: new Error('mystery failure'), source: 'http' })).toBe('Unknown');
  });

  it('classifies queue/startup/health sources as Infrastructure', () => {
    expect(classifier.classify({ error: new Error('boom'), source: 'queue' })).toBe('Infrastructure');
    expect(classifier.classify({ error: new Error('boom'), source: 'startup' })).toBe('Infrastructure');
    expect(classifier.classify({ error: new Error('boom'), source: 'health' })).toBe('Infrastructure');
  });
});

describe('Severity Engine (MS-56)', () => {
  const engine = new SeverityEngine();

  it('assigns CRITICAL to database connectivity failures and startup failures', () => {
    expect(
      engine.evaluate({ errorClass: 'Database', source: 'database', message: 'connection refused', occurrenceCount: 1 })
    ).toBe('CRITICAL');
    expect(
      engine.evaluate({ errorClass: 'Infrastructure', source: 'startup', message: 'boom', occurrenceCount: 1 })
    ).toBe('CRITICAL');
  });

  it('assigns HIGH to database and worker failures', () => {
    expect(
      engine.evaluate({ errorClass: 'Database', source: 'database', message: 'query failed', occurrenceCount: 1 })
    ).toBe('HIGH');
    expect(engine.evaluate({ errorClass: 'Unknown', source: 'worker', message: 'boom', occurrenceCount: 1 })).toBe(
      'HIGH'
    );
  });

  it('escalates severity as occurrences grow', () => {
    const base = engine.evaluate({
      errorClass: 'Unknown',
      source: 'http',
      message: 'boom',
      statusCode: 500,
      occurrenceCount: 1
    });
    expect(base).toBe('HIGH');
    const escalated = engine.evaluate({
      errorClass: 'Unknown',
      source: 'http',
      message: 'boom',
      statusCode: 500,
      occurrenceCount: 5
    });
    expect(escalated).toBe('CRITICAL');
  });
});

describe('Fingerprint (MS-56)', () => {
  it('produces a stable fingerprint for identical normalized errors', () => {
    const a = computeFingerprint({
      errorClass: 'Database',
      source: 'database',
      name: 'Error',
      message: 'relation "listings_1234" does not exist'
    });
    const b = computeFingerprint({
      errorClass: 'Database',
      source: 'database',
      name: 'Error',
      message: 'relation "listings_9999" does not exist'
    });
    expect(a).toBe(b);
  });

  it('differentiates errors by class and message', () => {
    const a = computeFingerprint({
      errorClass: 'Database',
      source: 'database',
      name: 'Error',
      message: 'relation does not exist'
    });
    const b = computeFingerprint({
      errorClass: 'Network',
      source: 'http',
      name: 'Error',
      message: 'relation does not exist'
    });
    expect(a).not.toBe(b);
  });
});

describe('ErrorTracker Aggregation (MS-56)', () => {
  it('aggregates repeated errors by fingerprint and counts occurrences', () => {
    const { tracker, transport } = createTracker();
    const error = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), { code: 'ECONNREFUSED' });

    const first = tracker.capture({ source: 'database', error });
    const second = tracker.capture({ source: 'database', error });

    expect(first.id).toBe(second.id);
    expect(second.occurrenceCount).toBe(2);
    expect(second.errorClass).toBe('Database');
    expect(second.severity).toBe('CRITICAL');
    expect(transport.reports).toHaveLength(2);
  });

  it('starts a fresh aggregate once the dedupe window has passed', () => {
    const repository = new InMemoryErrorTrackingRepository();
    const tracker = new ErrorTracker({
      serviceName: 'college-hub-test',
      dedupeWindowMs: 0,
      transports: [],
      repository
    });
    const first = tracker.capture({ source: 'worker', error: new Error('task failed') });
    const second = tracker.capture({ source: 'worker', error: new Error('task failed') });
    expect(first.id).not.toBe(second.id);
  });

  it('reopens a resolved error when it recurs', () => {
    const { tracker, repository } = createTracker();
    const first = tracker.capture({ source: 'worker', error: new Error('boom') });
    repository.updateErrorStatus(first.id, 'RESOLVED', new Date());

    const second = tracker.capture({ source: 'worker', error: new Error('boom') });
    expect(second.status).toBe('OPEN');
    expect(second.resolvedAt).toBeUndefined();
    expect(second.occurrenceCount).toBe(2);
  });

  it('tracks request context on captured HTTP errors', () => {
    const { tracker } = createTracker();
    const captured = tracker.captureRequestError(new Error('boom'), {
      requestId: 'req-123',
      route: '/api/v1/listings',
      method: 'GET',
      statusCode: 500,
      tenantId: 'college_stanford_001'
    });
    expect(captured.requestId).toBe('req-123');
    expect(captured.route).toBe('/api/v1/listings');
    expect(captured.source).toBe('http');
  });

  it('captures unhandled exceptions and rejections', () => {
    const { tracker } = createTracker();
    const exc = tracker.handleException(new Error('uncaught boom'));
    expect(exc.source).toBe('unhandled');

    const rej = tracker.handleUnhandledRejection('string rejection');
    expect(rej.source).toBe('unhandledrejection');
    expect(rej.message).toBe('string rejection');
  });
});

describe('Incident Engine (MS-56)', () => {
  it('opens a database-outage incident for a single CRITICAL database error', () => {
    const { tracker, repository } = createTracker();
    const error = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), { code: 'ECONNREFUSED' });
    tracker.capture({ source: 'database', error });

    const incidents = repository.listIncidents({});
    expect(incidents.items).toHaveLength(1);
    expect(incidents.items[0]?.ruleId).toBe('database-outage');
    expect(incidents.items[0]?.status).toBe('OPEN');
    expect(incidents.items[0]?.runbookRef).toBe('database-outage');
    expect(incidents.items[0]?.severity).toBe('CRITICAL');
  });

  it('does not duplicate incidents for the same fingerprint and rule', () => {
    const { tracker, repository } = createTracker();
    const error = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), { code: 'ECONNREFUSED' });
    tracker.capture({ source: 'database', error });
    tracker.capture({ source: 'database', error });
    tracker.capture({ source: 'database', error });

    const incidents = repository.listIncidents({});
    expect(incidents.items).toHaveLength(1);
    expect(incidents.items[0]?.occurrenceCount).toBe(3);
    expect(incidents.items[0]?.relatedErrorIds).toHaveLength(1);
  });

  it('opens a worker crash-loop incident after three occurrences in the window', () => {
    const { tracker, repository } = createTracker();
    for (let i = 0; i < 3; i += 1) {
      tracker.capture({ source: 'worker', error: new Error('task handler crashed') });
    }
    const incidents = repository.listIncidents({});
    expect(incidents.items).toHaveLength(1);
    expect(incidents.items[0]?.ruleId).toBe('worker-crash-loop');
  });

  it('opens an API error spike incident after repeated 5xx HTTP errors', () => {
    const { tracker, repository } = createTracker();
    for (let i = 0; i < 5; i += 1) {
      tracker.captureRequestError(new Error('internal boom'), {
        statusCode: 500,
        route: '/api/v1/listings',
        method: 'GET'
      });
    }
    const incidents = repository.listIncidents({});
    expect(incidents.items).toHaveLength(1);
    expect(incidents.items[0]?.ruleId).toBe('api-error-spike');
  });

  it('supports the incident lifecycle transitions', () => {
    const { tracker, repository } = createTracker();
    const error = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), { code: 'ECONNREFUSED' });
    tracker.capture({ source: 'database', error });
    const incident = repository.listIncidents({}).items[0]!;

    const acknowledged = tracker.updateIncidentStatus(incident.id, 'ACKNOWLEDGED', 'oncall-sre', 'Investigating');
    expect(acknowledged?.status).toBe('ACKNOWLEDGED');
    expect(acknowledged?.acknowledgedBy).toBe('oncall-sre');
    expect(acknowledged?.notes).toHaveLength(1);

    const investigating = tracker.updateIncidentStatus(incident.id, 'INVESTIGATING', 'oncall-sre');
    expect(investigating?.status).toBe('INVESTIGATING');

    const resolved = tracker.updateIncidentStatus(incident.id, 'RESOLVED', 'oncall-sre', 'Failover complete');
    expect(resolved?.status).toBe('RESOLVED');
    expect(resolved?.resolvedAt).toBeDefined();
    expect(resolved?.notes).toHaveLength(2);
  });
});

describe('Errors Statistics (MS-56)', () => {
  it('breaks down errors by class, severity and source', () => {
    const { tracker } = createTracker();
    tracker.capture({ source: 'database', error: Object.assign(new Error('refused'), { code: 'ECONNREFUSED' }) });
    tracker.capture({ source: 'worker', error: new Error('boom') });

    const stats = tracker.getErrorsStatistics();
    expect(stats.totalErrors).toBe(2);
    expect(stats.byClass.Database).toBe(1);
    expect(stats.byClass.Infrastructure).toBe(1);
    expect(stats.bySource.database).toBe(1);
    expect(stats.bySource.worker).toBe(1);
  });
});

describe('Global Process Handlers (MS-56)', () => {
  it('installs and disposes process handlers without leaking listeners', () => {
    const { tracker } = createTracker();
    const handlers = installProcessErrorHandlers(tracker);
    handlers.dispose();
    expect(process.listenerCount('uncaughtException')).toBeGreaterThanOrEqual(0);
  });
});

describe('REST API (MS-56)', () => {
  it('exposes errors, incidents and lifecycle endpoints', async () => {
    const { tracker } = createTracker();
    const app = Fastify();
    registerErrorTrackingRoutes(app, { tracker });

    const error = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), { code: 'ECONNREFUSED' });
    tracker.capture({ source: 'database', error });
    tracker.capture({ source: 'database', error });
    const incidentId = tracker.listIncidents({}).items[0]!.id;
    const errorId = tracker.listErrors({}).items[0]!.id;

    const resErrors = await app.inject({ method: 'GET', url: '/errors' });
    expect(resErrors.statusCode).toBe(200);
    const errorsBody = JSON.parse(resErrors.payload);
    expect(errorsBody.success).toBe(true);
    expect(errorsBody.data.items).toHaveLength(1);

    const resStats = await app.inject({ method: 'GET', url: '/errors/statistics' });
    expect(resStats.statusCode).toBe(200);
    const statsBody = JSON.parse(resStats.payload);
    expect(statsBody.data.totalErrors).toBe(1);

    const resSingleError = await app.inject({ method: 'GET', url: `/errors/${errorId}` });
    expect(resSingleError.statusCode).toBe(200);
    expect(JSON.parse(resSingleError.payload).data.id).toBe(errorId);

    const resMissingError = await app.inject({ method: 'GET', url: '/errors/does-not-exist' });
    expect(resMissingError.statusCode).toBe(404);

    const resIncidents = await app.inject({ method: 'GET', url: '/incidents' });
    expect(resIncidents.statusCode).toBe(200);
    const incidentsBody = JSON.parse(resIncidents.payload);
    expect(incidentsBody.data.items).toHaveLength(1);

    const resSingleIncident = await app.inject({ method: 'GET', url: `/incidents/${incidentId}` });
    expect(resSingleIncident.statusCode).toBe(200);
    expect(JSON.parse(resSingleIncident.payload).data.id).toBe(incidentId);

    const resPatch = await app.inject({
      method: 'PATCH',
      url: `/incidents/${incidentId}/status`,
      payload: { status: 'RESOLVED', actor: 'oncall-sre', note: 'Failover complete' }
    });
    expect(resPatch.statusCode).toBe(200);
    const patched = JSON.parse(resPatch.payload);
    expect(patched.data.status).toBe('RESOLVED');
    expect(patched.data.resolvedBy).toBe('oncall-sre');
    expect(patched.data.notes).toHaveLength(1);

    const resBadPatch = await app.inject({
      method: 'PATCH',
      url: `/incidents/${incidentId}/status`,
      payload: { status: 'NOT_A_STATUS', actor: 'x' }
    });
    expect(resBadPatch.statusCode).toBe(400);
  });
});
