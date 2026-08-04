/**
 * Campus Connect — Structured Request Logging Middleware
 * Logs strictly non-sensitive request metadata (requestId, traceId, endpoint, method, latency, statusCode, collegeId).
 * NEVER logs message content, trust score, recommendation explanations, private attributes, or JWT tokens.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

export async function requestLoggerMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const startTime = Date.now();

  reply.then(
    () => {
      const latency = Date.now() - startTime;
      const logEntry = {
        level: 'info',
        requestId: request.context?.requestId,
        traceId: request.context?.traceId,
        endpoint: request.url,
        method: request.method,
        latency,
        statusCode: reply.statusCode,
        collegeId: request.context?.collegeId
      };

      if (process.env['NODE_ENV'] !== 'test') {
        console.log(JSON.stringify(logEntry));
      }
    },
    (_error: unknown) => {
      // Handled by httpErrorHandler
    }
  );
}
