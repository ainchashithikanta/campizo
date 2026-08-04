/**
 * Error Tracking & Incident Response — Severity Engine (MS-56)
 * Computes an INFO..CRITICAL severity from the classification plus capture
 * context, and escalates the severity as the same error repeats frequently.
 */

import type { ErrorClass, ErrorSeverity, ErrorSource } from '../domain/entities.js';
import { SEVERITY_WEIGHTS, ERROR_SEVERITIES } from '../domain/entities.js';

export interface SeverityInput {
  errorClass: ErrorClass;
  source: ErrorSource;
  message: string;
  statusCode?: number | undefined;
  occurrenceCount: number;
}

function escalate(severity: ErrorSeverity, steps: number): ErrorSeverity {
  const weight = Math.min(SEVERITY_WEIGHTS.CRITICAL, SEVERITY_WEIGHTS[severity] + steps);
  return ERROR_SEVERITIES[weight] as ErrorSeverity;
}

export class SeverityEngine {
  public evaluate(input: SeverityInput): ErrorSeverity {
    const base = this.baseSeverity(input);
    if (input.occurrenceCount >= 10) {
      return escalate(base, 2);
    }
    if (input.occurrenceCount >= 5) {
      return escalate(base, 1);
    }
    return base;
  }

  private baseSeverity(input: SeverityInput): ErrorSeverity {
    const message = input.message.toLowerCase();

    if (/out of memory|heap limit|javascript heap|\boom\b/i.test(message)) {
      return 'CRITICAL';
    }
    if (input.source === 'startup') {
      return 'CRITICAL';
    }
    if (input.errorClass === 'Database') {
      return /connection refused|timeout|econnrefused|etimedout|enotfound|connect .* failed/i.test(message)
        ? 'CRITICAL'
        : 'HIGH';
    }
    if (input.errorClass === 'Network') {
      return /econnrefused|etimedout|enotfound|eai_again/i.test(message) ? 'HIGH' : 'MEDIUM';
    }
    if (input.errorClass === 'Infrastructure') {
      return input.source === 'unhandled' ||
        input.source === 'unhandledrejection' ||
        input.source === 'worker' ||
        input.source === 'queue'
        ? 'HIGH'
        : 'MEDIUM';
    }
    if (input.errorClass === 'Authentication') {
      return 'MEDIUM';
    }
    if (input.errorClass === 'Authorization') {
      return 'MEDIUM';
    }
    if (input.errorClass === 'Validation') {
      return 'LOW';
    }
    if (input.errorClass === 'BusinessLogic') {
      return 'INFO';
    }

    if (input.source === 'http') {
      return input.statusCode !== undefined && input.statusCode >= 500 ? 'HIGH' : 'LOW';
    }
    if (input.source === 'worker' || input.source === 'queue') {
      return 'HIGH';
    }
    if (input.source === 'health') {
      return 'MEDIUM';
    }
    return 'MEDIUM';
  }
}
