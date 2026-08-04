import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { baseColumns } from './base.js';
import { collegeTenants } from './tenants.js';
import { users } from './users.js';

export const auditLogs = pgTable(
  'audit_logs',
  {
    ...baseColumns,
    collegeId: uuid('college_id')
      .references(() => collegeTenants.id, { onDelete: 'cascade' })
      .notNull(),
    actorUserId: uuid('actor_user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    actorRole: varchar('actor_role', { length: 50 }).notNull(),
    action: varchar('action', { length: 100 }).notNull(),
    targetEntityId: varchar('target_entity_id', { length: 255 }).notNull(),
    targetEntityType: varchar('target_entity_type', { length: 100 }).notNull(),
    oldValue: jsonb('old_value'),
    newValue: jsonb('new_value'),
    ipAddress: varchar('ip_address', { length: 45 }).notNull(),
    userAgent: text('user_agent').notNull(),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull()
  },
  (table) => ({
    collegeIdIdx: index('audit_logs_college_id_idx').on(table.collegeId),
    actorUserIdIdx: index('audit_logs_actor_user_id_idx').on(table.actorUserId),
    actionIdx: index('audit_logs_action_idx').on(table.collegeId, table.action),
    createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt)
  })
);
