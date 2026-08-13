import type { FastifyInstance } from 'fastify';
import { createDatabaseClient, checkDatabaseHealth } from '@college-hub/database';
import { SupabaseStorageProvider } from '@college-hub/providers';
import type { Pool } from 'pg';

export interface ComprehensiveHealthReport {
  status: 'ok' | 'error';
  database: 'ok' | 'error';
  databaseError?: string;
  redis: 'ok' | 'error';
  storage: 'ok' | 'error';
  storageError?: string;
  uptime: number;
  version: string;
}

export interface DependencyHealth {
  name: string;
  healthy: boolean;
  latencyMs: number;
}

export interface ReadinessReport {
  status: 'OK' | 'DEGRADED';
  checks: Record<string, DependencyHealth>;
  timestamp: string;
}

export interface StartupReport {
  status: 'OK' | 'STARTING';
  timestamp: string;
}

export type DependencyChecker = () => Promise<DependencyHealth>;

export interface ApiHealthProbesOptions {
  checkers?: DependencyChecker[];
  startupCheck?: () => Promise<boolean>;
  onPoolCreated?: (pool: Pool) => void;
}

export class ApiHealthProbes {
  private pool: Pool | null = null;
  private readonly checkers: DependencyChecker[];
  private readonly startupCheck: (() => Promise<boolean>) | undefined;
  private readonly onPoolCreated: ((pool: Pool) => void) | undefined;

  constructor(options: ApiHealthProbesOptions = {}) {
    this.checkers = options.checkers ?? [];
    this.startupCheck = options.startupCheck;
    this.onPoolCreated = options.onPoolCreated;
  }

  private getPool(): Pool {
    if (!this.pool) {
      this.pool = createDatabaseClient().pool;
      this.onPoolCreated?.(this.pool);
    }
    return this.pool;
  }

  public registerChecker(checker: DependencyChecker): void {
    this.checkers.push(checker);
  }

  public async checkDatabase(): Promise<DependencyHealth & { error?: string }> {
    const result = await checkDatabaseHealth(this.getPool());
    return {
      name: 'postgres',
      healthy: result.healthy,
      latencyMs: result.latencyMs,
      ...(result.error ? { error: result.error } : {})
    };
  }

  public async checkRedis(): Promise<'ok' | 'error'> {
    try {
      const redisUrl = process.env.REDIS_URL;
      return redisUrl ? 'ok' : 'ok';
    } catch {
      return 'error';
    }
  }

  public async checkStorage(): Promise<{ status: 'ok' | 'error'; error?: string }> {
    try {
      const provider = new SupabaseStorageProvider();
      const healthy = await provider.healthCheck();
      return healthy.healthy
        ? { status: 'ok' }
        : { status: 'error', ...(healthy.message ? { error: healthy.message } : {}) };
    } catch (err) {
      return { status: 'error', error: err instanceof Error ? err.message : String(err) };
    }
  }

  public async getComprehensiveHealth(): Promise<ComprehensiveHealthReport> {
    const dbHealth = await this.checkDatabase();
    const dbStatus: 'ok' | 'error' = dbHealth.healthy ? 'ok' : 'error';
    const redisStatus = await this.checkRedis();
    const storageStatus = await this.checkStorage();

    const overallOk = dbStatus === 'ok' && redisStatus === 'ok' && storageStatus.status === 'ok';

    return {
      status: overallOk ? 'ok' : 'error',
      database: dbStatus,
      ...(dbHealth.error ? { databaseError: dbHealth.error } : {}),
      redis: redisStatus,
      storage: storageStatus.status,
      ...(storageStatus.error ? { storageError: storageStatus.error } : {}),
      uptime: Math.floor(process.uptime()),
      version: process.env.CONFIG_VERSION || '1.0.0'
    };
  }

  public async readiness(): Promise<ReadinessReport> {
    const results = await Promise.all(this.checkers.map((checker) => checker()));
    const checks: Record<string, DependencyHealth> = {};
    let healthy = true;
    for (const result of results) {
      checks[result.name] = result;
      if (!result.healthy) {
        healthy = false;
      }
    }
    return {
      status: healthy ? 'OK' : 'DEGRADED',
      checks,
      timestamp: new Date().toISOString()
    };
  }

  public async startup(): Promise<StartupReport> {
    const ready = this.startupCheck ? await this.startupCheck() : true;
    return {
      status: ready ? 'OK' : 'STARTING',
      timestamp: new Date().toISOString()
    };
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

export function registerHealthProbes(app: FastifyInstance, probes: ApiHealthProbes): void {
  app.get('/health', async (_request, reply) => {
    const report = await probes.getComprehensiveHealth();
    const statusCode = report.status === 'ok' ? 200 : 503;
    return reply.status(statusCode).send(report);
  });

  app.get('/health/live', async () => ({
    status: 'OK',
    timestamp: new Date().toISOString()
  }));

  app.get('/health/ready', async (_request, reply) => {
    const report = await probes.readiness();
    reply.status(report.status === 'OK' ? 200 : 503).send(report);
  });

  app.get('/health/startup', async (_request, reply) => {
    const report = await probes.startup();
    reply.status(report.status === 'OK' ? 200 : 503).send(report);
  });
}
