/**
 * Error Tracking & Incident Response — Zod Request Validators (MS-56)
 */

import { z } from 'zod';
import { ERROR_CLASSES, ERROR_SEVERITIES, ERROR_SOURCES, INCIDENT_STATUSES } from '../domain/entities.js';

export const ErrorQuerySchema = z.object({
  errorClass: z.enum(ERROR_CLASSES).optional(),
  severity: z.enum(ERROR_SEVERITIES).optional(),
  source: z.enum(ERROR_SOURCES).optional(),
  status: z.enum(INCIDENT_STATUSES).optional(),
  serviceName: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const IncidentQuerySchema = z.object({
  status: z.enum(INCIDENT_STATUSES).optional(),
  severity: z.enum(ERROR_SEVERITIES).optional(),
  serviceName: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const ErrorParamsSchema = z.object({
  id: z.string().min(1, 'Error ID is required')
});

export const IncidentParamsSchema = z.object({
  id: z.string().min(1, 'Incident ID is required')
});

export const UpdateIncidentStatusSchema = z.object({
  status: z.enum(INCIDENT_STATUSES),
  actor: z.string().min(1, 'Actor is required'),
  note: z.string().optional()
});

export type ErrorQueryParams = z.infer<typeof ErrorQuerySchema>;
export type IncidentQueryParams = z.infer<typeof IncidentQuerySchema>;
export type UpdateIncidentStatus = z.infer<typeof UpdateIncidentStatusSchema>;
