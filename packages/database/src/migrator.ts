import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDatabaseClient } from './client.js';
import { logger } from '@college-hub/logger';
import { resolve } from 'node:path';

export async function runMigrations(migrationsFolder?: string): Promise<void> {
  const { db, pool } = createDatabaseClient();
  const folder = migrationsFolder || resolve(process.cwd(), 'migrations');

  logger.info({ migrationsFolder: folder }, 'Executing database schema migrations...');
  try {
    await migrate(db, { migrationsFolder: folder });
    logger.info('✅ Database migrations executed successfully.');
  } catch (error) {
    logger.error({ error }, '❌ Migration execution failed');
    throw error;
  } finally {
    await pool.end();
  }
}
