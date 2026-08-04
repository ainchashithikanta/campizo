/**
 * Error Tracking & Incident Response — In-Memory Repository (MS-56)
 * Deterministic in-process storage used by the API monolith and tests. Mirrors
 * the repository contract so a durable adapter (PostgreSQL, Redis, ClickHouse)
 * can be swapped in later without changing the tracker core.
 */

import { ERROR_CLASSES, ERROR_SEVERITIES, ERROR_SOURCES } from '../../domain/entities.js';
import type {
  ErrorClass,
  ErrorSeverity,
  ErrorSource,
  IncidentEntity,
  IncidentStatus,
  LifecycleStatus,
  TrackedErrorEntity
} from '../../domain/entities.js';
import type {
  ErrorTrackingQuery,
  ErrorsStatistics,
  IncidentQuery,
  IncidentStatusUpdate,
  IErrorTrackingRepository,
  PaginatedResult
} from '../../domain/repository.interface.js';

function emptyStatistics(): ErrorsStatistics {
  const byClass = {} as Record<ErrorClass, number>;
  for (const key of ERROR_CLASSES) {
    byClass[key] = 0;
  }
  const bySeverity = {} as Record<ErrorSeverity, number>;
  for (const key of ERROR_SEVERITIES) {
    bySeverity[key] = 0;
  }
  const bySource = {} as Record<ErrorSource, number>;
  for (const key of ERROR_SOURCES) {
    bySource[key] = 0;
  }
  return {
    totalErrors: 0,
    openErrors: 0,
    resolvedErrors: 0,
    totalIncidents: 0,
    openIncidents: 0,
    byClass,
    bySeverity,
    bySource,
    byService: {},
    affectedServices: []
  };
}

function unionServices(a: string[], b: string[]): string[] {
  const set = new Set<string>([...a, ...b]);
  return Array.from(set).sort();
}

export class InMemoryErrorTrackingRepository implements IErrorTrackingRepository {
  private readonly errors = new Map<string, TrackedErrorEntity>();
  private readonly errorsByFingerprint = new Map<string, TrackedErrorEntity>();
  private readonly incidents = new Map<string, IncidentEntity>();

  public findAggregate(fingerprint: string, dedupeWindowMs: number): TrackedErrorEntity | null {
    const existing = this.errorsByFingerprint.get(fingerprint);
    if (!existing) {
      return null;
    }
    const windowStart = Date.now() - dedupeWindowMs;
    if (dedupeWindowMs <= 0 || existing.lastSeenAt.getTime() < windowStart) {
      return null;
    }
    return existing;
  }

  public upsertAggregate(error: TrackedErrorEntity): TrackedErrorEntity {
    this.errors.set(error.id, error);
    this.errorsByFingerprint.set(error.fingerprint, error);
    return error;
  }

  public getError(id: string): TrackedErrorEntity | null {
    return this.errors.get(id) ?? null;
  }

  public listErrors(query: ErrorTrackingQuery): PaginatedResult<TrackedErrorEntity> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.toLowerCase() ?? undefined;

    const filtered = Array.from(this.errors.values())
      .filter((error) => {
        if (query.errorClass !== undefined && error.errorClass !== query.errorClass) {
          return false;
        }
        if (query.severity !== undefined && error.severity !== query.severity) {
          return false;
        }
        if (query.source !== undefined && error.source !== query.source) {
          return false;
        }
        if (query.status !== undefined && error.status !== query.status) {
          return false;
        }
        if (query.serviceName !== undefined && error.serviceName !== query.serviceName) {
          return false;
        }
        if (search !== undefined) {
          const haystack = `${error.message} ${error.name} ${error.errorClass} ${error.route ?? ''}`.toLowerCase();
          if (!haystack.includes(search)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());

    const total = filtered.length;
    const start = (page - 1) * limit;
    return {
      items: filtered.slice(start, start + limit),
      total,
      hasMore: start + limit < total
    };
  }

  public getErrorsStatistics(): ErrorsStatistics {
    const stats = emptyStatistics();
    for (const error of this.errors.values()) {
      stats.totalErrors += 1;
      stats.byClass[error.errorClass] += 1;
      stats.bySeverity[error.severity] += 1;
      stats.bySource[error.source] += 1;
      stats.byService[error.serviceName] = (stats.byService[error.serviceName] ?? 0) + 1;
      if (error.status === 'OPEN' || error.status === 'ACKNOWLEDGED' || error.status === 'INVESTIGATING') {
        stats.openErrors += 1;
      }
      if (error.status === 'RESOLVED') {
        stats.resolvedErrors += 1;
      }
    }
    for (const incident of this.incidents.values()) {
      stats.totalIncidents += 1;
      if (incident.status === 'OPEN' || incident.status === 'ACKNOWLEDGED' || incident.status === 'INVESTIGATING') {
        stats.openIncidents += 1;
      }
    }
    stats.affectedServices = unionServices(
      Array.from(this.errors.values()).flatMap((error) => error.affectedServices),
      Array.from(this.incidents.values()).flatMap((incident) => incident.affectedServices)
    );
    return stats;
  }

  public updateErrorStatus(id: string, status: LifecycleStatus, at: Date): TrackedErrorEntity | null {
    const error = this.errors.get(id);
    if (!error) {
      return null;
    }
    const updated: TrackedErrorEntity = {
      ...error,
      status,
      resolvedAt: status === 'RESOLVED' ? at : status === 'CLOSED' ? undefined : error.resolvedAt,
      lastSeenAt: at
    };
    this.errors.set(id, updated);
    this.errorsByFingerprint.set(updated.fingerprint, updated);
    return updated;
  }

  public createIncident(incident: IncidentEntity): IncidentEntity {
    this.incidents.set(incident.id, incident);
    return incident;
  }

  public updateIncident(incident: IncidentEntity): IncidentEntity {
    this.incidents.set(incident.id, incident);
    return incident;
  }

  public getIncident(id: string): IncidentEntity | null {
    return this.incidents.get(id) ?? null;
  }

  public listIncidents(query: IncidentQuery): PaginatedResult<IncidentEntity> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const filtered = Array.from(this.incidents.values())
      .filter((incident) => {
        if (query.status !== undefined && incident.status !== query.status) {
          return false;
        }
        if (query.severity !== undefined && incident.severity !== query.severity) {
          return false;
        }
        if (query.serviceName !== undefined && incident.serviceName !== query.serviceName) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());

    const total = filtered.length;
    const start = (page - 1) * limit;
    return {
      items: filtered.slice(start, start + limit),
      total,
      hasMore: start + limit < total
    };
  }

  public findOpenIncident(fingerprint: string, ruleId: string): IncidentEntity | null {
    for (const incident of this.incidents.values()) {
      if (
        incident.fingerprint === fingerprint &&
        incident.ruleId === ruleId &&
        (incident.status === 'OPEN' || incident.status === 'ACKNOWLEDGED' || incident.status === 'INVESTIGATING')
      ) {
        return incident;
      }
    }
    return null;
  }

  public updateIncidentStatus(id: string, update: IncidentStatusUpdate): IncidentEntity | null {
    const incident = this.incidents.get(id);
    if (!incident) {
      return null;
    }
    const updated = applyIncidentTransition(incident, update.status, update.actor, update.note, update.at);
    this.incidents.set(id, updated);
    return updated;
  }

  public addRelatedError(incidentId: string, errorId: string): void {
    const incident = this.incidents.get(incidentId);
    if (!incident || incident.relatedErrorIds.includes(errorId)) {
      return;
    }
    this.incidents.set(incidentId, { ...incident, relatedErrorIds: [...incident.relatedErrorIds, errorId] });
  }
}

function applyIncidentTransition(
  incident: IncidentEntity,
  status: IncidentStatus,
  actor: string,
  note: string | undefined,
  at: Date
): IncidentEntity {
  const updated: IncidentEntity = {
    ...incident,
    status,
    acknowledgedAt: status === 'ACKNOWLEDGED' ? at : incident.acknowledgedAt,
    acknowledgedBy: status === 'ACKNOWLEDGED' ? actor : incident.acknowledgedBy,
    investigatingAt: status === 'INVESTIGATING' ? at : incident.investigatingAt,
    investigatingBy: status === 'INVESTIGATING' ? actor : incident.investigatingBy,
    resolvedAt: status === 'RESOLVED' ? at : status === 'CLOSED' ? undefined : incident.resolvedAt,
    resolvedBy: status === 'RESOLVED' ? actor : status === 'CLOSED' ? undefined : incident.resolvedBy,
    closedAt: status === 'CLOSED' ? at : undefined,
    closedBy: status === 'CLOSED' ? actor : undefined,
    lastSeenAt: at
  };
  if (note !== undefined) {
    updated.notes = [...incident.notes, `[${at.toISOString()}] ${actor}: ${note}`];
  }
  return updated;
}
