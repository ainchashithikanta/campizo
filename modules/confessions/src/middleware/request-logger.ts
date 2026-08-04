import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

/**
 * Safe request logger.
 *
 * Logs: requestId, collegeId, userId, method, url, latency, statusCode.
 * Never logs: confession content, anonymous pseudonyms, identity mappings.
 */
export function registerRequestLogger(fastify: FastifyInstance): void {
  fastify.addHook('onRequest', async (req: FastifyRequest, _reply: FastifyReply) => {
    (req as any).__startTime = Date.now();
  });

  fastify.addHook('onResponse', async (req: FastifyRequest, reply: FastifyReply) => {
    const startTime = (req as any).__startTime as number | undefined;
    const latencyMs = startTime ? Date.now() - startTime : -1;

    const ctx = req.ctx;
    const logEntry = {
      requestId: ctx?.requestId || req.headers['x-request-id'] || 'unknown',
      collegeId: ctx?.collegeId || 'unknown',
      userId: ctx?.userId || 'anonymous',
      method: req.method,
      url: req.url,
      statusCode: reply.statusCode,
      latencyMs
    };

    // Use Fastify's built-in logger if available; otherwise console
    if (req.log) {
      req.log.info(logEntry, 'request_completed');
    }
  });
}
