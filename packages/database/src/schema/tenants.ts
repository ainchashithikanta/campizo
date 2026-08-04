import { pgTable, varchar, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { baseColumns, auditColumns } from './base.js';

export const collegeTenants = pgTable(
  'college_tenants',
  {
    ...baseColumns,
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
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
    tier: varchar('tier', { length: 50 }).default('FREE').notNull(),
    customDomain: varchar('custom_domain', { length: 255 }),
    ...auditColumns
  },
  (table) => ({
    slugIdx: uniqueIndex('college_tenants_slug_idx').on(table.slug),
    customDomainIdx: index('college_tenants_custom_domain_idx').on(table.customDomain),
    deletedAtIdx: index('college_tenants_deleted_at_idx').on(table.deletedAt)
  })
);
