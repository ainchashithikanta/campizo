import { uuid, timestamp, integer } from 'drizzle-orm/pg-core';
import { isNull, type SQL } from 'drizzle-orm';

/**
 * Reusable Primary Key & Optimistic Locking Columns
 */
export const baseColumns = {
  id: uuid('id').defaultRandom().primaryKey(),
  version: integer('version').default(1).notNull() // Optimistic concurrency control counter
};

/**
 * Standard Audit Timestamps & Soft Delete Support
 */
export const auditColumns = {
  createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { mode: 'date', precision: 3 }) // Nullable for soft deletes
};

/**
 * Helper to exclude soft-deleted records from query filters
 */
export function activeRecordsOnly<T extends { deletedAt: any }>(table: T): SQL {
  return isNull(table.deletedAt);
}
