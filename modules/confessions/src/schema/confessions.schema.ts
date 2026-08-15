import {
  pgTable,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  uuid,
  index,
  uniqueIndex
} from 'drizzle-orm/pg-core';

// 1. confession_categories
export const confessionCategories = pgTable('confession_categories', {
  code: varchar('code', { length: 32 }).primaryKey(),
  name: varchar('name', { length: 64 }).notNull(),
  description: text('description'),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// 2. confessions (Aggregate Root)
export const confessions = pgTable(
  'confessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    categoryCode: varchar('category_code', { length: 32 })
      .notNull()
      .references(() => confessionCategories.code),
    title: varchar('title', { length: 256 }).notNull(),
    slug: varchar('slug', { length: 300 }).notNull(),
    content: text('content').notNull(),
    authorThreadPseudonym: varchar('author_thread_pseudonym', { length: 64 }).notNull(),
    isAnonymous: boolean('is_anonymous').notNull().default(true),
    status: varchar('status', { length: 32 }).notNull().default('PENDING_APPROVAL'), // DRAFT, PENDING_APPROVAL, PUBLISHED, QUARANTINED, ARCHIVED, DELETED
    upvotesCount: integer('upvotes_count').notNull().default(0),
    commentsCount: integer('comments_count').notNull().default(0),
    reportsCount: integer('reports_count').notNull().default(0),
    rankScore: numeric('rank_score', { precision: 10, scale: 4 }).notNull().default('0.0000'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true })
  },
  (table) => [
    index('idx_confessions_tenant_status_rank').on(table.collegeId, table.status, table.rankScore),
    index('idx_confessions_tenant_category').on(table.collegeId, table.categoryCode),
    uniqueIndex('idx_confessions_tenant_slug').on(table.collegeId, table.slug)
  ]
);

// 3. confession_comments
export const confessionComments = pgTable(
  'confession_comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    confessionId: uuid('confession_id')
      .notNull()
      .references(() => confessions.id, { onDelete: 'cascade' }),
    rootCommentId: uuid('root_comment_id'),
    parentCommentId: uuid('parent_comment_id'),
    depth: integer('depth').notNull().default(1), // Max nesting 8-10
    authorThreadPseudonym: varchar('author_thread_pseudonym', { length: 64 }).notNull(),
    content: text('content').notNull(),
    status: varchar('status', { length: 32 }).notNull().default('ACTIVE'), // ACTIVE, SOFT_DELETED, QUARANTINED
    upvotesCount: integer('upvotes_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('idx_comments_confession_root').on(table.confessionId, table.rootCommentId),
    index('idx_comments_tenant_confession').on(table.collegeId, table.confessionId),
    index('idx_comments_tree_flat').on(table.confessionId, table.rootCommentId, table.depth)
  ]
);

// 4. confession_votes
export const confessionVotes = pgTable(
  'confession_votes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    confessionId: uuid('confession_id')
      .notNull()
      .references(() => confessions.id, { onDelete: 'cascade' }),
    voterUserId: varchar('voter_user_id', { length: 64 }).notNull(),
    voteType: varchar('vote_type', { length: 16 }).notNull(), // UPVOTE, DOWNVOTE
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [uniqueIndex('idx_confession_votes_user_unique').on(table.confessionId, table.voterUserId)]
);

// 5. comment_votes
export const commentVotes = pgTable(
  'comment_votes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    commentId: uuid('comment_id')
      .notNull()
      .references(() => confessionComments.id, { onDelete: 'cascade' }),
    voterUserId: varchar('voter_user_id', { length: 64 }).notNull(),
    voteType: varchar('vote_type', { length: 16 }).notNull(), // UPVOTE
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [uniqueIndex('idx_comment_votes_user_unique').on(table.commentId, table.voterUserId)]
);

// 6. confession_bookmarks
export const confessionBookmarks = pgTable(
  'confession_bookmarks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    confessionId: uuid('confession_id')
      .notNull()
      .references(() => confessions.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 64 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [uniqueIndex('idx_bookmarks_user_confession_unique').on(table.userId, table.confessionId)]
);

// 7. confession_reports
export const confessionReports = pgTable(
  'confession_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    confessionId: uuid('confession_id')
      .notNull()
      .references(() => confessions.id, { onDelete: 'cascade' }),
    reporterUserId: varchar('reporter_user_id', { length: 64 }).notNull(),
    reasonCode: varchar('reason_code', { length: 32 }).notNull(),
    details: text('details'),
    status: varchar('status', { length: 32 }).notNull().default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [uniqueIndex('idx_reports_user_confession_unique').on(table.reporterUserId, table.confessionId)]
);

// 8. anonymous_thread_identities (Security Boundary)
export const anonymousThreadIdentities = pgTable(
  'anonymous_thread_identities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    confessionId: uuid('confession_id')
      .notNull()
      .references(() => confessions.id, { onDelete: 'cascade' }),
    userIdHash: varchar('user_id_hash', { length: 128 }).notNull(),
    assignedPseudonym: varchar('assigned_pseudonym', { length: 64 }).notNull(),
    isOp: boolean('is_op').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [uniqueIndex('idx_anon_identity_thread_user').on(table.confessionId, table.userIdHash)]
);

// 9. moderation_cases
export const moderationCases = pgTable(
  'moderation_cases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    confessionId: uuid('confession_id')
      .notNull()
      .references(() => confessions.id, { onDelete: 'cascade' }),
    severityLevel: integer('severity_level').notNull().default(3), // 1: Threats, 2: Doxxing, 3: Harassment, 4: Hate Speech, 5: Spam
    status: varchar('status', { length: 32 }).notNull().default('OPEN'), // OPEN, UNDER_REVIEW, QUARANTINED, CLOSED
    totalReports: integer('total_reports').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index('idx_mod_cases_severity_status').on(table.severityLevel, table.status)]
);

// 10. moderation_actions
export const moderationActions = pgTable('moderation_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  collegeId: varchar('college_id', { length: 64 }).notNull(),
  caseId: uuid('case_id')
    .notNull()
    .references(() => moderationCases.id, { onDelete: 'cascade' }),
  moderatorUserId: varchar('moderator_user_id', { length: 64 }).notNull(),
  action: varchar('action', { length: 32 }).notNull(), // RESTORE, HIDE, DELETE, ESCALATE
  reasonNote: text('reason_note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// 11. moderator_notes (Internal to moderators only)
export const moderatorNotes = pgTable('moderator_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  collegeId: varchar('college_id', { length: 64 }).notNull(),
  caseId: uuid('case_id')
    .notNull()
    .references(() => moderationCases.id, { onDelete: 'cascade' }),
  moderatorUserId: varchar('moderator_user_id', { length: 64 }).notNull(),
  noteText: text('note_text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// 12. confession_statistics (Read Model)
export const confessionStatistics = pgTable('confession_statistics', {
  confessionId: uuid('confession_id')
    .primaryKey()
    .references(() => confessions.id, { onDelete: 'cascade' }),
  collegeId: varchar('college_id', { length: 64 }).notNull(),
  totalViews: integer('total_views').notNull().default(0),
  totalUpvotes: integer('total_upvotes').notNull().default(0),
  totalComments: integer('total_comments').notNull().default(0),
  totalReports: integer('total_reports').notNull().default(0),
  trendingScore: numeric('trending_score', { precision: 10, scale: 4 }).notNull().default('0.0000'),
  hotScore: numeric('hot_score', { precision: 10, scale: 4 }).notNull().default('0.0000'),
  recentScore: numeric('recent_score', { precision: 10, scale: 4 }).notNull().default('0.0000'),
  controversialScore: numeric('controversial_score', { precision: 10, scale: 4 }).notNull().default('0.0000'),
  lastCalculatedAt: timestamp('last_calculated_at', { withTimezone: true }).notNull().defaultNow()
});

// 13. confession_notifications
export const confessionNotifications = pgTable('confession_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  collegeId: varchar('college_id', { length: 64 }).notNull(),
  recipientUserId: varchar('recipient_user_id', { length: 64 }).notNull(),
  notificationType: varchar('notification_type', { length: 32 }).notNull(),
  payloadJson: text('payload_json').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// 14. confession_audit_logs (Immutable Privacy Invariant)
export const confessionAuditLogs = pgTable('confession_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  collegeId: varchar('college_id', { length: 64 }).notNull(),
  action: varchar('action', { length: 64 }).notNull(),
  actorType: varchar('actor_type', { length: 32 }).notNull(), // SYSTEM, MODERATOR, ADMIN
  entityId: varchar('entity_id', { length: 64 }).notNull(),
  detailsJson: text('details_json'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// 15. ranking_snapshots (Immutable Atomic Switch)
export const rankingSnapshots = pgTable('ranking_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  collegeId: varchar('college_id', { length: 64 }).notNull(),
  snapshotType: varchar('snapshot_type', { length: 32 }).notNull(), // TRENDING, HOT
  topConfessionIdsJson: text('top_confession_ids_json').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// 16. report_reasons
export const reportReasons = pgTable('report_reasons', {
  code: varchar('code', { length: 32 }).primaryKey(),
  label: varchar('label', { length: 64 }).notNull(),
  severityLevel: integer('severity_level').notNull().default(3),
  isActive: boolean('is_active').notNull().default(true)
});

// 17. confession_media (Reserved for future expansion)
export const confessionMedia = pgTable('confession_media', {
  id: uuid('id').primaryKey().defaultRandom(),
  collegeId: varchar('college_id', { length: 64 }).notNull(),
  confessionId: uuid('confession_id')
    .notNull()
    .references(() => confessions.id, { onDelete: 'cascade' }),
  mediaType: varchar('media_type', { length: 32 }).notNull(), // IMAGE, AUDIO
  mediaUrl: text('media_url').notNull(),
  mimeType: varchar('mime_type', { length: 64 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});
