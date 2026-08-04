import { pgTable, uuid, varchar, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { baseColumns } from './base.js';
import { users } from './users.js';
import { collegeTenants } from './tenants.js';

export const userSessions = pgTable(
  'user_sessions',
  {
    ...baseColumns,
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    collegeId: uuid('college_id')
      .references(() => collegeTenants.id, { onDelete: 'cascade' })
      .notNull(),
    refreshTokenHash: varchar('refresh_token_hash', { length: 255 }).notNull(),
    deviceId: varchar('device_id', { length: 255 }).notNull(),
    deviceInfo: varchar('device_info', { length: 500 }).notNull(),
    ipAddress: varchar('ip_address', { length: 45 }).notNull(),
    isRevoked: boolean('is_revoked').default(false).notNull(),
    expiresAt: timestamp('expires_at', { mode: 'date', precision: 3 }).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull()
  },
  (table) => ({
    userIdIdx: index('user_sessions_user_id_idx').on(table.userId),
    collegeIdIdx: index('user_sessions_college_id_idx').on(table.collegeId),
    tokenHashIdx: index('user_sessions_token_hash_idx').on(table.refreshTokenHash),
    deviceIdIdx: index('user_sessions_device_id_idx').on(table.userId, table.deviceId)
  })
);
