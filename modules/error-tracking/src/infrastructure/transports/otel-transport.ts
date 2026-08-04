/**
 * Error Tracking & Incident Response — OpenTelemetry Events Transport (MS-56)
 * Provider that emits each captured error as an OTel span with classification
 * attributes and a recorded exception. Degrades to a no-op when tracing is
 * disabled (startSpan is safe to call unconditionally).
 */

import { startSpan } from '@college-hub/observability';
import type { TrackedErrorEntity } from '../../domain/entities.js';
import type { IErrorTransport } from '../../domain/transport.interface.js';

export class OTelErrorTransport implements IErrorTransport {
  public readonly name = 'otel';

  public report(error: TrackedErrorEntity): void {
    const handle = startSpan('error.tracked', {
      attributes: {
        'error.tracking.id': error.id,
        'error.tracking.fingerprint': error.fingerprint,
        'error.class': error.errorClass,
        'error.severity': error.severity,
        'error.source': error.source,
        'error.count': error.occurrenceCount,
        'error.message': error.message,
        'service.name': error.serviceName
      }
    });
    handle.recordException(new Error(error.message));
    handle.end('error');
  }
}
