import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

/**
 * IdempotencyStore Contract Interface
 */
export interface IIdempotencyStore {
  has(key: string): boolean | Promise<boolean>;
  get(key: string): unknown | Promise<unknown | null>;
  set(key: string, response: unknown): void | Promise<void>;
  clear?(): void | Promise<void>;
}

/**
 * In-memory idempotency store with TTL eviction.
 */
export class InMemoryIdempotencyStore implements IIdempotencyStore {
  private store = new Map<string, { response: unknown; expiresAt: number }>();
  private ttlMs: number;

  constructor(ttlMs: number = 24 * 60 * 60 * 1000) {
    this.ttlMs = ttlMs;
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  get(key: string): unknown | null {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) this.store.delete(key);
      return null;
    }
    return entry.response;
  }

  set(key: string, response: unknown): void {
    this.store.set(key, { response, expiresAt: Date.now() + this.ttlMs });
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * RedisIdempotencyStore Placeholder (Production Redis Implementation)
 */
export class RedisIdempotencyStore implements IIdempotencyStore {
  constructor(private redisClient?: any, private ttlSeconds: number = 86400) {}

  async has(key: string): Promise<boolean> {
    if (!this.redisClient) return false;
    const exists = await this.redisClient.exists(`idempotency:${key}`);
    return exists === 1;
  }

  async get(key: string): Promise<unknown | null> {
    if (!this.redisClient) return null;
    const val = await this.redisClient.get(`idempotency:${key}`);
    return val ? JSON.parse(val) : null;
  }

  async set(key: string, response: unknown): Promise<void> {
    if (!this.redisClient) return;
    await this.redisClient.setex(`idempotency:${key}`, this.ttlSeconds, JSON.stringify(response));
  }
}

/**
 * Backward compatibility alias for IdempotencyStore.
 */
export class IdempotencyStore extends InMemoryIdempotencyStore {}

/**
 * Write-endpoint paths that require idempotency protection.
 */
const IDEMPOTENT_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Idempotency guard middleware.
 */
export function createIdempotencyMiddleware(store: IIdempotencyStore) {
  return async function idempotencyMiddleware(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!IDEMPOTENT_METHODS.has(req.method)) return;

    const key = req.ctx?.idempotencyKey;
    if (!key) return;

    const collegeId = req.ctx?.collegeId || 'unknown';
    const compositeKey = `${collegeId}:${key}`;

    const cached = await store.get(compositeKey);
    if (cached) {
      reply.status(200).send(cached);
      return;
    }
  };
}

/**
 * onSend hook that captures the response for idempotent write requests.
 */
export function createIdempotencyOnSend(store: IIdempotencyStore) {
  return async function idempotencyOnSend(
    req: FastifyRequest,
    _reply: FastifyReply,
    payload: string
  ): Promise<string> {
    if (!IDEMPOTENT_METHODS.has(req.method)) return payload;

    const key = req.ctx?.idempotencyKey;
    if (!key) return payload;

    const collegeId = req.ctx?.collegeId || 'unknown';
    const compositeKey = `${collegeId}:${key}`;

    const exists = await store.has(compositeKey);
    if (!exists) {
      try {
        await store.set(compositeKey, JSON.parse(payload));
      } catch {
        // non-JSON payloads are not cached
      }
    }

    return payload;
  };
}

/**
 * Register idempotency hooks on a Fastify instance.
 */
export function registerIdempotency(fastify: FastifyInstance, store: IIdempotencyStore): void {
  fastify.addHook('onRequest', createIdempotencyMiddleware(store));
  fastify.addHook('onSend', createIdempotencyOnSend(store));
}
