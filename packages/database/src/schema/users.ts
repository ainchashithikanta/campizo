import { pgTable, uuid, varchar, boolean, integer, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { baseColumns, auditColumns } from './base.js';
import { collegeTenants } from './tenants.js';

export const users = pgTable(
  'users',
  {
    ...baseColumns,
    collegeId: uuid('college_id')
      .references(() => collegeTenants.id, { onDelete: 'cascade' })
      .notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    username: varchar('username', { length: 100 }).notNull(),
    displayName: varchar('display_name', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: varchar('role', { length: 50 }).default('STUDENT').notNull(),
    status: varchar('status', { length: 50 }).default('PENDING_VERIFICATION').notNull(),
    isEmailVerified: boolean('is_email_verified').default(false).notNull(),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    failedLoginAttempts: integer('failed_login_attempts').default(0).notNull(),
    lockoutUntil: timestamp('lockout_until', { mode: 'date', precision: 3 }),
    anonymousTokenSalt: varchar('anonymous_token_salt', { length: 255 }),
    ...auditColumns
  },
  (table) => ({
    usernameIdx: uniqueIndex('users_username_idx').on(table.username),
    collegeEmailIdx: uniqueIndex('users_college_email_idx').on(table.collegeId, table.email),
    collegeIdIdx: index('users_college_id_idx').on(table.collegeId),
    deletedAtIdx: index('users_deleted_at_idx').on(table.deletedAt)
  })
);
