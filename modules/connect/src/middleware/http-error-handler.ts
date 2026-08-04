/**
 * Campus Connect — Standardized Fastify HTTP Error Handler Middleware
 * Formats every HTTP response into the ApiV1Response<T> envelope.
 * Maps application and domain errors to standard HTTP status codes (400, 401, 403, 404, 409, 422, 423, 500).
 */

import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { CampusConnectApplicationError, mapDomainErrorToApplicationError } from '../errors/application-errors.js';

export interface ApiV1Response<T = unknown> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    httpStatus: number;
    details?: Record<string, unknown>;
  } | null;
  metadata: {
    requestId: string;
    traceId: string;
    collegeId: string;
    timestamp: string;
  };
}

export function formatApiV1Success<T>(data: T, request: FastifyRequest): ApiV1Response<T> {
  return {
    success: true,
    data,
    error: null,
    metadata: {
      requestId: request.context?.requestId || 'req_unknown',
      traceId: request.context?.traceId || 'trace_unknown',
      collegeId: request.context?.collegeId || 'global',
      timestamp: new Date().toISOString()
    }
  };
}

export function httpErrorHandler(error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply): void {
  const appError: CampusConnectApplicationError = mapDomainErrorToApplicationError(error);

  const responseEnvelope: ApiV1Response = {
    success: false,
    data: null,
    error: {
      code: appError.code,
      message: appError.message,
      httpStatus: appError.statusCode
    },
    metadata: {
      requestId: request.context?.requestId || 'req_unknown',
      traceId: request.context?.traceId || 'trace_unknown',
      collegeId: request.context?.collegeId || 'global',
      timestamp: new Date().toISOString()
    }
  };

  reply.status(appError.statusCode).send(responseEnvelope);
}
