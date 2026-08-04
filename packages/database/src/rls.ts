import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { logger } from '@college-hub/logger';

export interface TenantContextOptions {
  collegeId: string;
  isSuperAdmin?: boolean;
}

/**
 * SQL Helper to enable Row Level Security on a database table
 */
export function enableRlsSql(tableName: string): string {
  return `ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;`;
}

/**
 * SQL Helper to create tenant isolation policy on a table containing `college_id`
 */
export function createTenantPolicySql(tableName: string): string {
  return `
    DROP POLICY IF EXISTS tenant_isolation_policy ON "${tableName}";
    CREATE POLICY tenant_isolation_policy ON "${tableName}"
      AS RESTRICTIVE
      USING (
        CURRENT_SETTING('app.is_super_admin', true) = 'true' OR
        college_id::text = CURRENT_SETTING('app.current_college_id', true)
      )
      WITH CHECK (
        CURRENT_SETTING('app.is_super_admin', true) = 'true' OR
        college_id::text = CURRENT_SETTING('app.current_college_id', true)
      );
  `.trim();
}

/**
 * SQL statement setting the session-level tenant variables for PostgreSQL RLS evaluation
 */
export function setTenantContextSql(collegeId: string, isSuperAdmin: boolean = false): string {
  const superAdminFlag = isSuperAdmin ? 'true' : 'false';
  return `
    SET LOCAL app.current_college_id = '${collegeId}';
    SET LOCAL app.is_super_admin = '${superAdminFlag}';
  `.trim();
}

/**
 * Executes a database transaction scoped strictly to the specified tenant context.
 * Guarantees that app.current_college_id is populated on the DB session prior to query execution.
 */
export async function withTenantContext<T>(
  db: NodePgDatabase<any>,
  options: TenantContextOptions,
  callback: (tx: NodePgDatabase<any>) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    logger.debug(
      { collegeId: options.collegeId, isSuperAdmin: options.isSuperAdmin },
      'Setting DB transaction RLS session variables'
    );

    // Set session-scoped RLS variable (RESET automatically on transaction commit/rollback)
    await tx.execute(sql.raw(setTenantContextSql(options.collegeId, options.isSuperAdmin)));

    // Execute callback within transaction
    return callback(tx);
  });
}
