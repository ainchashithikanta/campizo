/**
 * Error Tracking & Incident Response — Typed API Client (MS-56)
 * Wraps the platform error tracking REST endpoints for the operational console.
 */

import { apiGet, apiPatch, buildQueryString } from './api-client';

export type ErrorSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
export type ErrorClass =
  | 'Validation'
  | 'Infrastructure'
  | 'Database'
  | 'Network'
  | 'Authentication'
  | 'Authorization'
  | 'BusinessLogic'
  | 'Unknown';

export interface TrackedErrorDto {
  id: string;
  fingerprint: string;
  errorClass: ErrorClass;
  severity: ErrorSeverity;
  source: string;
  serviceName: string;
  message: string;
  name: string;
  code?: string;
  stackTrace?: string;
  causeChain: string[];
  moduleId?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  tenantId?: string;
  userId?: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  attributes: Record<string, unknown>;
  status: IncidentStatus;
  firstSeenAt: string;
  lastSeenAt: string;
  occurrenceCount: number;
  affectedServices: string[];
  resolvedAt?: string;
}

export interface IncidentDto {
  id: string;
  ruleId: string;
  fingerprint: string;
  title: string;
  summary: string;
  severity: ErrorSeverity;
  status: IncidentStatus;
  source: string;
  serviceName: string;
  relatedErrorIds: string[];
  occurrenceCount: number;
  affectedServices: string[];
  firstSeenAt: string;
  lastSeenAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  investigatingAt?: string;
  investigatingBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  closedAt?: string;
  closedBy?: string;
  runbookRef?: string;
  notes: string[];
  attributes: Record<string, unknown>;
}

export interface ErrorsStatisticsDto {
  totalErrors: number;
  openErrors: number;
  resolvedErrors: number;
  totalIncidents: number;
  openIncidents: number;
  byClass: Record<ErrorClass, number>;
  bySeverity: Record<ErrorSeverity, number>;
  bySource: Record<string, number>;
  byService: Record<string, number>;
  affectedServices: string[];
}

export interface PaginatedResultDto<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

export interface ErrorQuery {
  errorClass?: ErrorClass;
  severity?: ErrorSeverity;
  source?: string;
  status?: IncidentStatus;
  serviceName?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface IncidentQuery {
  status?: IncidentStatus;
  severity?: ErrorSeverity;
  serviceName?: string;
  page?: number;
  limit?: number;
}

export async function fetchErrors(query: ErrorQuery = {}): Promise<PaginatedResultDto<TrackedErrorDto>> {
  return apiGet<PaginatedResultDto<TrackedErrorDto>>(
    `/api/errors${buildQueryString(query as Record<string, unknown>)}`
  );
}

export async function fetchError(id: string): Promise<TrackedErrorDto> {
  return apiGet<TrackedErrorDto>(`/api/errors/${id}`);
}

export async function fetchErrorsStatistics(): Promise<ErrorsStatisticsDto> {
  return apiGet<ErrorsStatisticsDto>('/api/errors/statistics');
}

export async function fetchIncidents(query: IncidentQuery = {}): Promise<PaginatedResultDto<IncidentDto>> {
  return apiGet<PaginatedResultDto<IncidentDto>>(`/api/incidents${buildQueryString(query as Record<string, unknown>)}`);
}

export async function fetchIncident(id: string): Promise<IncidentDto> {
  return apiGet<IncidentDto>(`/api/incidents/${id}`);
}

export async function updateIncidentStatus(
  id: string,
  status: IncidentStatus,
  actor: string,
  note?: string
): Promise<IncidentDto> {
  return apiPatch<IncidentDto>(`/api/incidents/${id}/status`, { status, actor, note });
}
