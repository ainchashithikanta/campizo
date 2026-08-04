import { createClient } from 'redis';
import { createDatabaseClient, checkDatabaseHealth } from '@college-hub/database';
import { logger } from '@college-hub/logger';
import { tryGetErrorTracker } from '@college-hub/mod-error-tracking';
import {
  observability,
  instrumentRedisClient,
  instrumentQueryClient,
  startPoolStatsMonitor
} from '@college-hub/observability';
import type { EnvConfig } from '@college-hub/config';
import type { Pool } from 'pg';

export interface WorkerTaskHandler<P = unknown> {
  (payload: P): Promise<void> | void;
}

export interface WorkerDependencyHealth {
  name: string;
  healthy: boolean;
  latencyMs: number;
}

export interface WorkerReadinessReport {
  status: 'OK' | 'DEGRADED';
  redis: WorkerDependencyHealth;
  postgres: WorkerDependencyHealth;
  registeredTasks: number;
  timestamp: string;
}

export interface WorkerRuntimeOptions {
  redisConnectTimeoutMs?: number;
}

export class WorkerRuntime {
  private redisClient: ReturnType<typeof createClient> | null = null;
  private redisConnectPromise: Promise<void> | null = null;
  private pool: Pool | null = null;
  private tasks = new Map<string, WorkerTaskHandler>();
  private startedAt: number | null = null;

  constructor(
    private readonly env: EnvConfig,
    private readonly options: WorkerRuntimeOptions = {}
  ) {}

  private getPool(): Pool {
    if (!this.pool) {
      const pool = createDatabaseClient({
        connectionString: this.env.DATABASE_URL,
        maxConnections: this.env.DATABASE_MAX_CONNECTIONS
      }).pool;
      instrumentQueryClient(pool, observability.db);
      startPoolStatsMonitor(pool, observability.db);
      this.pool = pool;
    }
    return this.pool;
  }

  private getRedis(): ReturnType<typeof createClient> {
    let client = this.redisClient;
    if (!client) {
      client = createClient({
        url: this.env.REDIS_URL,
        socket: {
          connectTimeout: this.options.redisConnectTimeoutMs ?? 2000,
          reconnectStrategy: false
        }
      });
      const created = client;
      instrumentRedisClient(created, observability.cache);
      created.on('connect', () => {
        observability.cache.setConnected(true);
      });
      created.on('end', () => {
        observability.cache.setConnected(false);
        this.redisConnectPromise = null;
      });
      created.on('error', (err) => {
        if (!created.isOpen) {
          this.redisConnectPromise = null;
        }
        tryGetErrorTracker()?.recordDependencyFailure('redis', err, { task: 'runtime' });
        logger.error({ err }, 'Redis client error in worker runtime');
      });
      this.redisClient = created;
    }
    return client;
  }

  private async ensureRedisConnected(): Promise<void> {
    const client = this.getRedis();
    if (client.isOpen) {
      return;
    }
    if (!this.redisConnectPromise) {
      this.redisConnectPromise = client.connect().then(
        () => undefined,
        (err: unknown) => {
          this.redisConnectPromise = null;
          throw err;
        }
      );
    }
    await this.redisConnectPromise;
  }

  public registerTask<P = unknown>(name: string, handler: WorkerTaskHandler<P>): void {
    if (this.tasks.has(name)) {
      throw new Error(`Worker task '${name}' is already registered`);
    }
    this.tasks.set(name, (async (payload: unknown) => {
      try {
        await handler(payload as P);
      } catch (err) {
        const tracker = tryGetErrorTracker();
        if (tracker !== undefined) {
          tracker.capture({
            source: 'worker',
            error: err,
            moduleId: 'worker',
            attributes: { task: name, retried: false }
          });
        }
        throw err;
      }
    }) as WorkerTaskHandler);
    logger.info({ task: name }, `Registered background worker task '${name}'`);
  }

  public getRegisteredTasks(): string[] {
    return Array.from(this.tasks.keys());
  }

  public async start(): Promise<void> {
    this.startedAt = Date.now();
    logger.info('Starting College Hub background worker runtime...');

    try {
      await this.ensureRedisConnected();
      const pong = await this.getRedis().ping();
      logger.info({ response: pong }, 'Redis connectivity established for worker runtime');
    } catch (err) {
      tryGetErrorTracker()?.recordDependencyFailure('redis', err, { task: 'startup' });
      logger.warn({ err }, 'Worker runtime could not reach Redis at startup; readiness will report degraded');
    }

    const dbHealth = await checkDatabaseHealth(this.getPool());
    if (!dbHealth.healthy) {
      tryGetErrorTracker()?.recordDependencyFailure('database', new Error('PostgreSQL startup probe failed'), {
        latencyMs: dbHealth.latencyMs
      });
    }
    logger.info(
      { healthy: dbHealth.healthy, latencyMs: dbHealth.latencyMs },
      'Worker runtime PostgreSQL connectivity probe'
    );
  }

  public async checkRedisHealth(): Promise<WorkerDependencyHealth> {
    const startTime = Date.now();
    const client = this.getRedis();
    try {
      await this.ensureRedisConnected();
      await client.ping();
      return { name: 'redis', healthy: true, latencyMs: Date.now() - startTime };
    } catch (err) {
      tryGetErrorTracker()?.recordDependencyFailure('redis', err, { task: 'health-probe' });
      logger.error({ err }, 'Redis health check failed');
      return { name: 'redis', healthy: false, latencyMs: Date.now() - startTime };
    }
  }

  public async checkPostgresHealth(): Promise<WorkerDependencyHealth> {
    const result = await checkDatabaseHealth(this.getPool());
    if (!result.healthy) {
      tryGetErrorTracker()?.recordDependencyFailure('database', new Error('PostgreSQL health probe failed'), {
        latencyMs: result.latencyMs
      });
    }
    return { name: 'postgres', healthy: result.healthy, latencyMs: result.latencyMs };
  }

  public async readiness(): Promise<WorkerReadinessReport> {
    const [redis, postgres] = await Promise.all([this.checkRedisHealth(), this.checkPostgresHealth()]);
    const status = redis.healthy && postgres.healthy ? 'OK' : 'DEGRADED';
    return {
      status,
      redis,
      postgres,
      registeredTasks: this.tasks.size,
      timestamp: new Date().toISOString()
    };
  }

  public getUptimeMs(): number {
    return this.startedAt ? Date.now() - this.startedAt : 0;
  }

  public async stop(): Promise<void> {
    logger.info('Stopping worker runtime and releasing connections...');
    if (this.redisClient) {
      try {
        if (this.redisClient.isOpen) {
          await this.redisClient.quit();
        } else {
          this.redisClient.destroy();
        }
      } catch (err) {
        if (!(err instanceof Error && err.message === 'The client is closed')) {
          logger.warn({ err }, 'Error while closing Redis connection');
        }
      }
      this.redisClient = null;
      this.redisConnectPromise = null;
    }
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
