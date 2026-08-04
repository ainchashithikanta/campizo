/**
 * Error Tracking & Incident Response — Console Transport (MS-56)
 * Development provider that prints a one-line JSON summary per captured error.
 */

import type { TrackedErrorEntity } from '../../domain/entities.js';
import type { IErrorTransport } from '../../domain/transport.interface.js';

export class ConsoleErrorTransport implements IErrorTransport {
  public readonly name = 'console';

  public report(error: TrackedErrorEntity): void {
    const line = JSON.stringify({
      type: 'error.tracked',
      id: error.id,
      class: error.errorClass,
      severity: error.severity,
      source: error.source,
      service: error.serviceName,
      count: error.occurrenceCount,
      message: error.message
    });
    console.error(line);
  }
}
