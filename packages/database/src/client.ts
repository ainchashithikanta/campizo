import pkg from 'pg';
const { Pool } = pkg;
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema/index.js';
import { logger } from '@college-hub/logger';

export type DatabaseClient = NodePgDatabase<typeof schema>;

export interface DatabaseClientOptions {
  connectionString?: string;
  maxConnections?: number;
}

export function createDatabaseClient(options: DatabaseClientOptions = {}): {
  db: DatabaseClient;
  pool: InstanceType<typeof Pool>;
} {
  const rawConnectionString =
    options.connectionString ||
    process.env.DATABASE_URL ||
    'postgresql://collegehub_user:collegehub_password@localhost:5432/collegehub_db';

  const connectionString = rawConnectionString.replace(/[?&]sslmode=[^&]*/i, '').replace(/[?&]$/, '');

  const pool = new Pool({
    connectionString,
    max: options.maxConnections || 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: /supabase|pooler\.supabase/i.test(rawConnectionString) || rawConnectionString.includes('sslmode')
      ? { rejectUnauthorized: false }
      : undefined
  });

  pool.on('error', (err) => {
    logger.error({ err }, 'Unexpected error on idle PostgreSQL client pool connection');
  });

  const db = drizzle(pool, { schema });
  return { db, pool };
}

export async function checkDatabaseHealth(
  pool: InstanceType<typeof Pool>
): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
  const startTime = Date.now();
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      const latencyMs = Date.now() - startTime;
      return { healthy: true, latencyMs };
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error({ error }, 'Database health check query failed');
    return {
      healthy: false,
      latencyMs: Date.now() - startTime,
      error: error instanceof Error ? `${error.name}: ${error.message.split('\n')[0]}` : String(error)
    };
  }
}
