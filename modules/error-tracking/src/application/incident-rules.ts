/**
 * Error Tracking & Incident Response — Automatic Incident Rules (MS-56)
 * Deterministic rules that open an incident when an aggregated error crosses a
 * severity/occurrence threshold within a rolling window.
 */

import type { ErrorClass, ErrorSeverity, ErrorSource, TrackedErrorEntity } from '../domain/entities.js';

export interface IncidentRule {
  id: string;
  name: string;
  description: string;
  errorClass: ErrorClass | 'any';
  source: ErrorSource | 'any';
  minSeverity: ErrorSeverity;
  minOccurrences: number;
  windowSeconds: number;
  runbookRef: string;
}

export const INCIDENT_RULES: IncidentRule[] = [
  {
    id: 'database-outage',
    name: 'PostgreSQL Outage Detected',
    description: 'A CRITICAL database-class error was captured, indicating a potential database outage.',
    errorClass: 'Database',
    source: 'any',
    minSeverity: 'CRITICAL',
    minOccurrences: 1,
    windowSeconds: 300,
    runbookRef: 'database-outage'
  },
  {
    id: 'redis-outage',
    name: 'Redis Outage Detected',
    description: 'A CRITICAL Redis connectivity error was captured, indicating a cache/session/queue outage.',
    errorClass: 'any',
    source: 'redis',
    minSeverity: 'CRITICAL',
    minOccurrences: 1,
    windowSeconds: 300,
    runbookRef: 'redis-outage'
  },
  {
    id: 'worker-crash-loop',
    name: 'Worker Crash Loop Detected',
    description: 'The same worker task failed three or more times within five minutes.',
    errorClass: 'any',
    source: 'worker',
    minSeverity: 'HIGH',
    minOccurrences: 3,
    windowSeconds: 300,
    runbookRef: 'worker-unavailable'
  },
  {
    id: 'queue-backlog',
    name: 'Queue Processing Backlog Detected',
    description: 'A queue-processing error repeated five or more times within five minutes.',
    errorClass: 'any',
    source: 'queue',
    minSeverity: 'MEDIUM',
    minOccurrences: 5,
    windowSeconds: 300,
    runbookRef: 'queue-backlog'
  },
  {
    id: 'api-error-spike',
    name: 'Repeated API Failures Detected',
    description: 'The same HTTP error repeated five or more times within five minutes at HIGH severity.',
    errorClass: 'any',
    source: 'http',
    minSeverity: 'HIGH',
    minOccurrences: 5,
    windowSeconds: 300,
    runbookRef: 'api-unavailable'
  },
  {
    id: 'memory-exhaustion',
    name: 'Memory Exhaustion Detected',
    description: 'A CRITICAL out-of-memory infrastructure error was captured.',
    errorClass: 'Infrastructure',
    source: 'any',
    minSeverity: 'CRITICAL',
    minOccurrences: 1,
    windowSeconds: 300,
    runbookRef: 'deployment-rollback'
  }
];
