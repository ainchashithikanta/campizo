/**
 * Campus Connect — Idempotency Middleware
 * Caches and re-plays responses for state-mutating HTTP operations carrying an Idempotency-Key.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

interface CachedResponse {
  statusCode: number;
  payload: unknown;
  timestamp: number;
}

const idempotencyCache = new Map<string, CachedResponse>();

export async function idempotencyMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const isWriteMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
  if (!isWriteMethod) return;

  const idempotencyKey = request.connectContext?.idempotencyKey || (request.headers['idempotency-key'] as string | undefined);
  if (!idempotencyKey) return;

  const collegeId = request.connectContext?.collegeId || 'global';
  const cacheKey = `${collegeId}:${idempotencyKey}:${request.url}`;

  const cached = idempotencyCache.get(cacheKey);
  if (cached) {
    if (Date.now() - cached.timestamp < 86400000) {
      reply.status(cached.statusCode).send(cached.payload);
      return;
    } else {
      idempotencyCache.delete(cacheKey);
    }
  }

  const originalSend = reply.send.bind(reply);
  reply.send = function (payload: any): FastifyReply {
    if (reply.statusCode >= 200 && reply.statusCode < 300) {
      try {
        const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
        idempotencyCache.set(cacheKey, {
          statusCode: reply.statusCode,
          payload: parsed,
          timestamp: Date.now()
        });
      } catch {
        // Fallback for non-JSON payloads
      }
    }
    return originalSend(payload);
  };
}

export function clearIdempotencyCache(): void {
  idempotencyCache.clear();
}
