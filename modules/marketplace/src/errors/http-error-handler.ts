import { FastifyReply, FastifyRequest } from 'fastify';
import { mapDomainToApplicationError, ApplicationError } from './application-errors.js';

export interface ApiV1Response<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    requestId?: string;
    timestamp: string;
  };
  meta?: {
    requestId?: string;
    timestamp: string;
    pagination?: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  };
}

export function handleHttpError(error: unknown, request: FastifyRequest, reply: FastifyReply): void {
  const appError = mapDomainToApplicationError(error);
  const requestId = (request.headers['x-request-id'] as string) || 'req-unknown';

  const response: ApiV1Response = {
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      requestId,
      timestamp: new Date().toISOString()
    }
  };

  reply.status(appError.statusCode).send(response);
}
