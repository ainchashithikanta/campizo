/**
 * Error Tracking & Incident Response — Repository Interface (MS-56)
 * Storage abstraction for aggregated errors and incidents.
 */

import type {
  ErrorClass,
  ErrorSeverity,
  ErrorSource,
  IncidentEntity,
  IncidentStatus,
  LifecycleStatus,
  TrackedErrorEntity
} from './entities.js';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

export interface ErrorTrackingQuery {
  errorClass?: ErrorClass | undefined;
  severity?: ErrorSeverity | undefined;
  source?: ErrorSource | undefined;
  status?: LifecycleStatus | undefined;
  serviceName?: string | undefined;
  search?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface IncidentQuery {
  status?: IncidentStatus | undefined;
  severity?: ErrorSeverity | undefined;
  serviceName?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface ErrorsStatistics {
  totalErrors: number;
  openErrors: number;
  resolvedErrors: number;
  totalIncidents: number;
  openIncidents: number;
  byClass: Record<ErrorClass, number>;
  bySeverity: Record<ErrorSeverity, number>;
  bySource: Record<ErrorSource, number>;
  byService: Record<string, number>;
  affectedServices: string[];
}

export interface IncidentStatusUpdate {
  status: IncidentStatus;
  actor: string;
  note?: string | undefined;
  at: Date;
}

export interface IErrorTrackingRepository {
  /** Look up an aggregated error with the same fingerprint seen inside the dedupe window. */
  findAggregate(fingerprint: string, dedupeWindowMs: number): TrackedErrorEntity | null;

  /** Insert a new aggregated error or persist an updated aggregate. */
  upsertAggregate(error: TrackedErrorEntity): TrackedErrorEntity;

  getError(id: string): TrackedErrorEntity | null;
  listErrors(query: ErrorTrackingQuery): PaginatedResult<TrackedErrorEntity>;
  getErrorsStatistics(): ErrorsStatistics;
  updateErrorStatus(id: string, status: LifecycleStatus, at: Date): TrackedErrorEntity | null;

  createIncident(incident: IncidentEntity): IncidentEntity;
  updateIncident(incident: IncidentEntity): IncidentEntity;
  getIncident(id: string): IncidentEntity | null;
  listIncidents(query: IncidentQuery): PaginatedResult<IncidentEntity>;
  findOpenIncident(fingerprint: string, ruleId: string): IncidentEntity | null;
  updateIncidentStatus(id: string, update: IncidentStatusUpdate): IncidentEntity | null;
  addRelatedError(incidentId: string, errorId: string): void;
}
