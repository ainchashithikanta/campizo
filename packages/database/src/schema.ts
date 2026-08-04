import { pgTable, uuid, varchar, text, jsonb, timestamp, boolean } from 'drizzle-orm/pg-core';

// 1. Multi-Tenant Colleges Table
export const collegeTenants = pgTable('college_tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  allowedEmailDomains: jsonb('allowed_email_domains').$type<string[]>().notNull(),
  theme: jsonb('theme')
    .$type<{
      primaryColor: string;
      secondaryColor: string;
      logoUrl: string;
      faviconUrl: string;
      darkModeDefault: boolean;
    }>()
    .notNull(),
  enabledModules: jsonb('enabled_modules').$type<string[]>().notNull(),
  moderationPolicy: jsonb('moderation_policy')
    .$type<{
      confessionsAutoApprove: boolean;
      professorsReviewModeration: 'PRE_MODERATION' | 'POST_MODERATION';
      assignedModeratorUserIds: string[];
    }>()
    .notNull(),
  customDomain: varchar('custom_domain', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// 2. Users Table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  collegeId: uuid('college_id')
    .references(() => collegeTenants.id)
    .notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('STUDENT'),
  isEmailVerified: boolean('is_email_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// 3. Audit Logs Table (Tamper-evident administrative history)
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  collegeId: uuid('college_id')
    .references(() => collegeTenants.id)
    .notNull(),
  actorUserId: uuid('actor_user_id')
    .references(() => users.id)
    .notNull(),
  actorRole: varchar('actor_role', { length: 50 }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  targetEntityId: varchar('target_entity_id', { length: 255 }).notNull(),
  targetEntityType: varchar('target_entity_type', { length: 100 }).notNull(),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  ipAddress: varchar('ip_address', { length: 45 }).notNull(),
  userAgent: text('user_agent').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});
