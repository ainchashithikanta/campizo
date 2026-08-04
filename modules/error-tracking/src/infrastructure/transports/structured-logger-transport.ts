/**
 * Error Tracking & Incident Response — Structured Logger Transport (MS-56)
 * Production provider that emits structured error events through the shared
 * pino logger (PII-redacted, trace-context aware via TraceContextStore).
 */

import { logger } from '@college-hub/logger';
import type { TrackedErrorEntity } from '../../domain/entities.js';
import type { IErrorTransport } from '../../domain/transport.interface.js';

export class StructuredLoggerErrorTransport implements IErrorTransport {
  public readonly name = 'structured-logger';

  public report(error: TrackedErrorEntity): void {
    const err = new Error(error.message);
    err.name = error.name;
    if (error.stackTrace !== undefined) {
      err.stack = error.stackTrace;
    }
    logger.error(
      {
        err,
        errorTracking: {
          id: error.id,
          fingerprint: error.fingerprint,
          class: error.errorClass,
          severity: error.severity,
          source: error.source,
          serviceName: error.serviceName,
          occurrenceCount: error.occurrenceCount,
          firstSeenAt: error.firstSeenAt.toISOString(),
          lastSeenAt: error.lastSeenAt.toISOString(),
          ...(error.code !== undefined ? { code: error.code } : {}),
          ...(error.moduleId !== undefined ? { moduleId: error.moduleId } : {}),
          ...(error.route !== undefined ? { route: error.route } : {}),
          ...(error.method !== undefined ? { method: error.method } : {}),
          ...(error.statusCode !== undefined ? { statusCode: error.statusCode } : {}),
          ...(error.requestId !== undefined ? { requestId: error.requestId } : {}),
          ...(error.traceId !== undefined ? { traceId: error.traceId } : {}),
          ...(error.tenantId !== undefined ? { tenantId: error.tenantId } : {})
        }
      },
      `error.tracked ${error.errorClass}/${error.severity} in ${error.serviceName}`
    );
  }
}
