import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { logger, TraceContextStore } from '@college-hub/logger';
import { StructuredAuditLogger } from '@college-hub/security';
import { tryGetErrorTracker } from '@college-hub/mod-error-tracking';
import { tenantContextPlugin } from './tenant-context.plugin.js';

export interface PipelineOptions {
  enableSecurityHeaders?: boolean;
  enableCors?: boolean;
  rateLimitMaxRequests?: number;
  rateLimitWindowMs?: number;
}

async function gatewayPipelinePluginFn(fastify: FastifyInstance, opts: PipelineOptions): Promise<void> {
  const auditLogger = new StructuredAuditLogger();

  // 1. Request ID & Trace Correlation Initializer (onRequest hook)
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const headerReqId = (request.headers['x-request-id'] || request.headers['x-correlation-id']) as string | undefined;
    const requestId = headerReqId || randomUUID();
    const traceId = (request.headers['x-trace-id'] as string) || requestId;

    request.headers['x-request-id'] = requestId;
    reply.header('x-request-id', requestId);
    reply.header('x-correlation-id', requestId);

    TraceContextStore.enterWith({
      traceId,
      tenantId: (request.headers['x-college-id'] as string) || 'default-college'
    });
  });

  // 2. Security Headers (Helmet)
  if (opts.enableSecurityHeaders !== false) {
    await fastify.register(helmet, {
      contentSecurityPolicy: true,
      crossOriginEmbedderPolicy: false
    });
  }

  // 3. CORS Configuration
  if (opts.enableCors !== false) {
    await fastify.register(cors, {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-college-id',
        'x-college-slug',
        'x-request-id',
        'x-idempotency-key'
      ]
    });
  }

  // 4. Rate Limiting Plugin
  await fastify.register(rateLimit, {
    max: opts.rateLimitMaxRequests || 100,
    timeWindow: opts.rateLimitWindowMs || 60_000,
    keyGenerator: (req) => {
      const tenantId = (req.headers['x-college-id'] as string) || 'global';
      const userId = (req.headers['x-user-id'] as string) || 'anon';
      return `${tenantId}:${userId}:${req.ip}`;
    }
  });

  // 5. Tenant Context Plugin (MS-08 Resolution)
  await fastify.register(tenantContextPlugin);

  // 6. Idempotency Key Processor (preHandler hook)
  fastify.addHook('preHandler', async (request: FastifyRequest) => {
    const idempotencyKey = request.headers['x-idempotency-key'] as string | undefined;
    if (idempotencyKey) {
      logger.info({ idempotencyKey, url: request.url }, 'Processing idempotent request');
    }
  });

  // 7. Structured Request Logger (onResponse hook)
  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = TraceContextStore.getContext();
    const requestId = (request.headers['x-request-id'] as string) || 'unknown';
    const userId = (request.headers['x-user-id'] as string) || context?.userId || undefined;
    const collegeId = (request.headers['x-college-id'] as string) || context?.tenantId || undefined;

    logger.info(
      {
        requestId,
        traceId: context?.traceId,
        tenantId: collegeId,
        collegeId,
        userId,
        url: request.url,
        method: request.method,
        statusCode: reply.statusCode,
        responseTimeMs: reply.elapsedTime,
        ipAddress: request.ip,
        userAgent: (request.headers['user-agent'] as string) || 'unknown'
      },
      `HTTP ${request.method} ${request.url} - ${reply.statusCode}`
    );
  });

  // 8. 404 Not Found Handler (Standardized API Error Envelope)
  fastify.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    const requestId = (request.headers['x-request-id'] as string) || 'unknown';
    reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found.`,
        requestId
      }
    });
  });

  // 9. Global Exception Handler (Standardized API Error Envelope)
  fastify.setErrorHandler(
    (error: Error & { statusCode?: number; code?: string }, request: FastifyRequest, reply: FastifyReply) => {
      const statusCode = error.statusCode || 500;
      const requestId = (request.headers['x-request-id'] as string) || 'unknown';
      const userId = (request.headers['x-user-id'] as string) || undefined;
      const collegeId = (request.headers['x-college-id'] as string) || undefined;

      const logFn = statusCode >= 500 ? logger.error.bind(logger) : logger.warn.bind(logger);

      logFn(
        {
          err: error,
          stack: error.stack,
          requestId,
          userId,
          collegeId,
          url: request.url,
          method: request.method,
          statusCode,
          ipAddress: request.ip,
          userAgent: (request.headers['user-agent'] as string) || 'unknown'
        },
        `API Exception: ${error.message}`
      );

      if (statusCode >= 500) {
        auditLogger.logAction({
          collegeId: collegeId || 'system',
          actorUserId: userId || 'guest',
          actorRole: 'SYSTEM',
          severity: 'CRITICAL',
          action: 'UNHANDLED_EXCEPTION',
          targetEntityId: request.url,
          targetEntityType: 'ENDPOINT',
          reason: error.message,
          ipAddress: request.ip,
          userAgent: (request.headers['user-agent'] as string) || 'unknown'
        });

        const tracker = tryGetErrorTracker();
        if (tracker !== undefined) {
          tracker.captureRequestError(error, {
            requestId,
            traceId: TraceContextStore.getContext()?.traceId,
            tenantId: collegeId || undefined,
            route: request.url,
            method: request.method,
            statusCode,
            moduleId: 'api'
          });
        }
      }

      reply.status(statusCode).send({
        success: false,
        error: {
          code: error.code || (statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR'),
          message:
            statusCode === 500 && process.env['NODE_ENV'] === 'production'
              ? 'An internal error occurred.'
              : error.message,
          requestId
        }
      });
    }
  );
}

export const gatewayPipelinePlugin = fp(gatewayPipelinePluginFn, {
  name: 'gateway-pipeline-plugin'
});
