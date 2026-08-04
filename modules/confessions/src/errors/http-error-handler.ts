import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { mapDomainErrorToApplicationError } from './application-errors.js';

export function handleConfessionHttpError(error: unknown, req: FastifyRequest, reply: FastifyReply): void {
  const collegeId = req.ctx?.collegeId || (req.headers['x-college-id'] as string) || 'unknown';
  const requestId = req.ctx?.requestId || (req.headers['x-request-id'] as string) || `req-${Date.now()}`;

  if (error instanceof ZodError) {
    reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload or parameters.',
        details: { issues: error.issues }
      },
      metadata: { requestId, collegeId, timestamp: new Date().toISOString() }
    });
    return;
  }

  const appErr = mapDomainErrorToApplicationError(error);

  reply.status(appErr.statusCode).send({
    success: false,
    error: {
      code: appErr.code,
      message: appErr.message
    },
    metadata: { requestId, collegeId, timestamp: new Date().toISOString() }
  });
}
