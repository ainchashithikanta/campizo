import { createDatabaseClient, type DatabaseClient } from './client.js';
import { collegeTenants } from './schema/tenants.js';
import { logger } from '@college-hub/logger';

export interface DatabaseSeeder {
  readonly version: string;
  seed(db: DatabaseClient): Promise<void>;
}

export class CoreFoundationSeeder implements DatabaseSeeder {
  public readonly version = '1.0.0';

  public async seed(db: DatabaseClient): Promise<void> {
    logger.info('Seeding core foundation college tenants...');

    await db
      .insert(collegeTenants)
      .values([
        {
          name: 'Stanford University',
          slug: 'stanford',
          allowedEmailDomains: ['@stanford.edu'],
          theme: {
            primaryColor: '#8C1515',
            secondaryColor: '#000000',
            logoUrl: 'https://stanford.edu/logo.png',
            faviconUrl: 'https://stanford.edu/favicon.ico',
            darkModeDefault: true
          },
          enabledModules: ['rate-my-professor', 'materials-pyqs', 'auth'],
          moderationPolicy: {
            confessionsAutoApprove: true,
            professorsReviewModeration: 'POST_MODERATION',
            assignedModeratorUserIds: []
          },
          tier: 'ENTERPRISE'
        },
        {
          name: 'Massachusetts Institute of Technology',
          slug: 'mit',
          allowedEmailDomains: ['@mit.edu'],
          theme: {
            primaryColor: '#A31F34',
            secondaryColor: '#8A8B8C',
            logoUrl: 'https://mit.edu/logo.png',
            faviconUrl: 'https://mit.edu/favicon.ico',
            darkModeDefault: false
          },
          enabledModules: ['rate-my-professor', 'marketplace', 'confessions', 'auth'],
          moderationPolicy: {
            confessionsAutoApprove: false,
            professorsReviewModeration: 'PRE_MODERATION',
            assignedModeratorUserIds: []
          },
          tier: 'PRO'
        }
      ])
      .onConflictDoNothing({ target: collegeTenants.slug });

    logger.info('✅ Core foundation seeding complete.');
  }
}

export async function runSeeders(): Promise<void> {
  const { db, pool } = createDatabaseClient();
  const seeder = new CoreFoundationSeeder();

  try {
    await seeder.seed(db);
  } catch (error) {
    logger.error({ error }, '❌ Database seeding failed');
    throw error;
  } finally {
    await pool.end();
  }
}
