/**
 * Error Tracking & Incident Response — Domain Entities & Types (MS-56)
 *
 * Canonical classification, severity, aggregation and incident lifecycle model
 * for the College Hub platform. Everything here is persistence agnostic.
 */

export const ERROR_CLASSES = [
  'Validation',
  'Infrastructure',
  'Database',
  'Network',
  'Authentication',
  'Authorization',
  'BusinessLogic',
  'Unknown'
] as const;
export type ErrorClass = (typeof ERROR_CLASSES)[number];

export const ERROR_SEVERITIES = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type ErrorSeverity = (typeof ERROR_SEVERITIES)[number];

export const ERROR_SOURCES = [
  'http',
  'worker',
  'startup',
  'shutdown',
  'health',
  'unhandled',
  'unhandledrejection',
  'database',
  'redis',
  'queue',
  'module'
] as const;
export type ErrorSource = (typeof ERROR_SOURCES)[number];

export const INCIDENT_STATUSES = ['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'CLOSED'] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

/** Errors and incidents share the same lifecycle state machine. */
export type LifecycleStatus = IncidentStatus;

/** A single aggregated error occurrence group (deduplicated by fingerprint). */
export interface TrackedErrorEntity {
  id: string;
  fingerprint: string;
  errorClass: ErrorClass;
  severity: ErrorSeverity;
  source: ErrorSource;
  serviceName: string;
  message: string;
  name: string;
  code: string | undefined;
  stackTrace: string | undefined;
  causeChain: string[];
  moduleId: string | undefined;
  route: string | undefined;
  method: string | undefined;
  statusCode: number | undefined;
  tenantId: string | undefined;
  userId: string | undefined;
  requestId: string | undefined;
  traceId: string | undefined;
  spanId: string | undefined;
  attributes: Record<string, unknown>;
  status: LifecycleStatus;
  firstSeenAt: Date;
  lastSeenAt: Date;
  occurrenceCount: number;
  affectedServices: string[];
  recentOccurrences: Date[];
  resolvedAt: Date | undefined;
}

/** A high-level incident opened by the automatic incident engine. */
export interface IncidentEntity {
  id: string;
  ruleId: string;
  fingerprint: string;
  title: string;
  summary: string;
  severity: ErrorSeverity;
  status: IncidentStatus;
  source: ErrorSource;
  serviceName: string;
  relatedErrorIds: string[];
  occurrenceCount: number;
  affectedServices: string[];
  firstSeenAt: Date;
  lastSeenAt: Date;
  acknowledgedAt: Date | undefined;
  acknowledgedBy: string | undefined;
  investigatingAt: Date | undefined;
  investigatingBy: string | undefined;
  resolvedAt: Date | undefined;
  resolvedBy: string | undefined;
  closedAt: Date | undefined;
  closedBy: string | undefined;
  runbookRef: string | undefined;
  notes: string[];
  attributes: Record<string, unknown>;
}

/** Ordered severity weights used for comparisons and escalation. */
export const SEVERITY_WEIGHTS: Record<ErrorSeverity, number> = {
  INFO: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};

export const OPEN_INCIDENT_STATUSES: readonly IncidentStatus[] = ['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING'];
