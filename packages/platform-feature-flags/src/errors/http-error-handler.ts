/**
 * Standardized HTTP Error Handler & Response Envelope Builder
 */

import { RequestContext } from '../middleware/request-context.js';
import { ApplicationError, mapDomainToApplicationError } from './application-errors.js';

export interface ApiV1Response<T = unknown> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    httpStatus: number;
  } | null;
  metadata: {
    requestId: string;
    traceId: string;
    collegeId: string;
    timestamp: string;
  };
}

export function buildSuccessResponse<T>(data: T, ctx: RequestContext): ApiV1Response<T> {
  return {
    success: true,
    data,
    error: null,
    metadata: {
      requestId: ctx.requestId,
      traceId: ctx.traceId,
      collegeId: ctx.collegeId,
      timestamp: new Date().toISOString()
    }
  };
}

export function buildErrorResponse(rawError: unknown, ctx: RequestContext): ApiV1Response<null> {
  const appErr: ApplicationError = mapDomainToApplicationError(rawError);

  return {
    success: false,
    data: null,
    error: {
      code: appErr.code,
      message: appErr.message,
      httpStatus: appErr.httpStatus
    },
    metadata: {
      requestId: ctx.requestId,
      traceId: ctx.traceId,
      collegeId: ctx.collegeId,
      timestamp: new Date().toISOString()
    }
  };
}
