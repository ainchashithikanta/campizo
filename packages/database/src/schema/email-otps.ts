import { pgTable, uuid, varchar, boolean, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { baseColumns } from './base.js';
import { collegeTenants } from './tenants.js';

export const emailOtps = pgTable(
  'email_otps',
  {
    ...baseColumns,
    collegeId: uuid('college_id')
      .references(() => collegeTenants.id, { onDelete: 'cascade' })
      .notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    otpHash: varchar('otp_hash', { length: 255 }).notNull(),
    attemptsCount: integer('attempts_count').default(0).notNull(),
    isUsed: boolean('is_used').default(false).notNull(),
    expiresAt: timestamp('expires_at', { mode: 'date', precision: 3 }).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull()
  },
  (table) => ({
    emailCollegeIdx: index('email_otps_email_college_idx').on(table.collegeId, table.email),
    expiresAtIdx: index('email_otps_expires_at_idx').on(table.expiresAt)
  })
);
