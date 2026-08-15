/**
 * Placement Guidance & Knowledge Base Module — Drizzle ORM Database Schema
 * Defines normalized tables for companies, experiences, versions, questions bank, question tags,
 * discussions, replies, company statistics cache, search history, trending metrics, and admin roadmaps.
 */

import { pgTable, text, timestamp, integer, boolean, numeric, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const companies = pgTable(
  'placement_companies',
  {
    id: text('id').primaryKey(),
    collegeId: text('college_id').notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    website: text('website'),
    officialWebsite: text('official_website'),
    logoUrl: text('logo_url'),
    bannerUrl: text('banner_url'),
    careerUrl: text('career_url'),
    glassdoorUrl: text('glassdoor_url'),
    industry: text('industry').notNull().default('Technology'),
    tier: text('tier').notNull().default('TIER_1'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true })
  },
  (table: any) => ({
    tenantSlugIdx: uniqueIndex('idx_placement_comp_tenant_slug').on(table.collegeId, table.slug),
    collegeIdx: index('idx_placement_comp_college').on(table.collegeId)
  })
);

export const placementExperiences = pgTable(
  'placement_experiences',
  {
    id: text('id').primaryKey(),
    collegeId: text('college_id').notNull(),
    companyId: text('company_id')
      .notNull()
      .references(() => companies.id),
    authorId: text('author_id').notNull(),
    roleTitle: text('role_title').notNull(),
    jobType: text('job_type').notNull(), // 'INTERNSHIP' | 'FULL_TIME'
    branch: text('branch').notNull(),
    cgpa: numeric('cgpa', { precision: 4, scale: 2 }).notNull(),
    ctcOfferedLpa: numeric('ctc_offered_lpa', { precision: 6, scale: 2 }),
    stipendMonthly: numeric('stipend_monthly', { precision: 8, scale: 2 }),
    offerStatus: text('offer_status').notNull().default('ACCEPTED'), // 'ACCEPTED' | 'REJECTED' | 'PENDING'
    difficultyRating: integer('difficulty_rating').notNull().default(3),
    overallRating: integer('overall_rating').notNull().default(4),
    summary: text('summary').notNull(),
    preparationTips: text('preparation_tips'),
    versionNumber: integer('version_number').notNull().default(1),
    helpfulCount: integer('helpful_count').notNull().default(0),
    reportsCount: integer('reports_count').notNull().default(0),
    isAnonymous: boolean('is_anonymous').notNull().default(false),
    status: text('status').notNull().default('APPROVED'), // 'APPROVED' | 'PENDING' | 'FLAGGED'
    vectorEmbedding: jsonb('vector_embedding'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true })
  },
  (table: any) => ({
    tenantIdx: index('idx_placement_exp_tenant').on(table.collegeId),
    companyIdx: index('idx_placement_exp_company').on(table.companyId),
    authorIdx: index('idx_placement_exp_author').on(table.authorId),
    roleTypeIdx: index('idx_placement_exp_role_type').on(table.roleTitle, table.jobType)
  })
);

export const placementQuestions = pgTable(
  'placement_questions',
  {
    id: text('id').primaryKey(),
    collegeId: text('college_id').notNull(),
    companyId: text('company_id').references(() => companies.id),
    companyName: text('company_name').notNull(),
    roleTitle: text('role_title').notNull(),
    questionText: text('question_text').notNull(),
    topic: text('topic').notNull().default('ALGORITHMS'),
    difficulty: text('difficulty').notNull().default('MEDIUM'), // 'EASY' | 'MEDIUM' | 'HARD'
    roundType: text('round_type').notNull().default('TECHNICAL'), // 'ONLINE_ASSESSMENT' | 'TECHNICAL' | 'SYSTEM_DESIGN' | 'HR'
    jobType: text('job_type').notNull().default('FULL_TIME'), // 'INTERNSHIP' | 'FULL_TIME'
    branch: text('branch').notNull().default('Computer Science'),
    batchYear: integer('batch_year').notNull().default(2026),
    frequencyCount: integer('frequency_count').notNull().default(1),
    helpfulCount: integer('helpful_count').notNull().default(0),
    reportsCount: integer('reports_count').notNull().default(0),
    status: text('status').notNull().default('ACTIVE'), // 'ACTIVE' | 'FLAGGED'
    authorId: text('author_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true })
  },
  (table: any) => ({
    tenantCompanyTopicIdx: index('idx_placement_q_tenant_company_topic').on(
      table.collegeId,
      table.companyName,
      table.topic
    ),
    difficultyJobTypeIdx: index('idx_placement_q_difficulty_job').on(table.difficulty, table.jobType)
  })
);

export const questionTags = pgTable(
  'placement_question_tags',
  {
    id: text('id').primaryKey(),
    questionId: text('question_id')
      .notNull()
      .references(() => placementQuestions.id, { onDelete: 'cascade' }),
    tagName: text('tag_name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table: any) => ({
    qTagPairIdx: uniqueIndex('idx_q_tag_pair').on(table.questionId, table.tagName)
  })
);

export const discussionThreads = pgTable(
  'placement_discussion_threads',
  {
    id: text('id').primaryKey(),
    collegeId: text('college_id').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    authorId: text('author_id').notNull(),
    authorName: text('author_name').notNull().default('Verified Student'),
    topic: text('topic').notNull().default('INTERVIEW_PREP'),
    companySlug: text('company_slug'),
    upvotesCount: integer('upvotes_count').notNull().default(0),
    downvotesCount: integer('downvotes_count').notNull().default(0),
    repliesCount: integer('replies_count').notNull().default(0),
    viewsCount: integer('views_count').notNull().default(0),
    acceptedReplyId: text('accepted_reply_id'),
    status: text('status').notNull().default('ACTIVE'), // 'ACTIVE' | 'CLOSED' | 'FLAGGED'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true })
  },
  (table: any) => ({
    tenantTopicIdx: index('idx_disc_tenant_topic').on(table.collegeId, table.topic),
    authorIdx: index('idx_disc_author').on(table.authorId)
  })
);

export const discussionReplies = pgTable(
  'placement_discussion_replies',
  {
    id: text('id').primaryKey(),
    threadId: text('thread_id')
      .notNull()
      .references(() => discussionThreads.id, { onDelete: 'cascade' }),
    authorId: text('author_id').notNull(),
    authorName: text('author_name').notNull().default('Verified Senior'),
    content: text('content').notNull(),
    upvotesCount: integer('upvotes_count').notNull().default(0),
    downvotesCount: integer('downvotes_count').notNull().default(0),
    isAcceptedAnswer: boolean('is_accepted_answer').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true })
  },
  (table: any) => ({
    threadIdx: index('idx_reply_thread').on(table.threadId)
  })
);

export const companyStatisticsCache = pgTable(
  'company_statistics_cache',
  {
    id: text('id').primaryKey(),
    collegeId: text('college_id').notNull(),
    companyId: text('company_id')
      .notNull()
      .references(() => companies.id),
    interviewCount: integer('interview_count').notNull().default(0),
    avgCtcLpa: numeric('avg_ctc_lpa', { precision: 6, scale: 2 }).notNull().default('0.00'),
    highestCtcLpa: numeric('highest_ctc_lpa', { precision: 6, scale: 2 }).notNull().default('0.00'),
    avgDifficulty: numeric('avg_difficulty', { precision: 3, scale: 2 }).notNull().default('3.00'),
    internshipCount: integer('internship_count').notNull().default(0),
    fullTimeCount: integer('full_time_count').notNull().default(0),
    mostCommonTopics: jsonb('most_common_topics').$type<string[]>().notNull().default([]),
    lastComputedAt: timestamp('last_computed_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table: any) => ({
    tenantCompStatIdx: uniqueIndex('idx_stat_tenant_comp').on(table.collegeId, table.companyId)
  })
);

export const searchHistory = pgTable(
  'placement_search_history',
  {
    id: text('id').primaryKey(),
    collegeId: text('college_id').notNull(),
    studentProfileId: text('student_profile_id').notNull(),
    queryText: text('query_text').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table: any) => ({
    tenantQueryIdx: index('idx_search_history_tenant').on(table.collegeId, table.queryText)
  })
);

export const trendingMetrics = pgTable(
  'placement_trending_metrics',
  {
    id: text('id').primaryKey(),
    collegeId: text('college_id').notNull(),
    metricType: text('metric_type').notNull(), // 'COMPANY' | 'TOPIC' | 'QUESTION'
    targetId: text('target_id').notNull(),
    targetName: text('target_name').notNull(),
    score: integer('score').notNull().default(0),
    lastCalculatedAt: timestamp('last_calculated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table: any) => ({
    tenantMetricIdx: index('idx_trending_tenant_type').on(table.collegeId, table.metricType)
  })
);

export const adminRoadmaps = pgTable(
  'placement_admin_roadmaps',
  {
    id: text('id').primaryKey(),
    collegeId: text('college_id').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    steps: jsonb('steps')
      .$type<Array<{ order: number; topic: string; description: string; recommendedProblemsCount: number }>>()
      .notNull()
      .default([]),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table: any) => ({
    tenantRoadmapIdx: index('idx_admin_roadmap_tenant').on(table.collegeId)
  })
);

export const placementExperienceVersions = pgTable(
  'placement_experience_versions',
  {
    id: text('id').primaryKey(),
    experienceId: text('experience_id')
      .notNull()
      .references(() => placementExperiences.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    roleTitle: text('role_title').notNull(),
    jobType: text('job_type').notNull(),
    branch: text('branch').notNull(),
    cgpa: numeric('cgpa', { precision: 4, scale: 2 }).notNull(),
    ctcOfferedLpa: numeric('ctc_offered_lpa', { precision: 6, scale: 2 }),
    summary: text('summary').notNull(),
    preparationTips: text('preparation_tips'),
    createdById: text('created_by_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table: any) => ({
    expVersionIdx: uniqueIndex('idx_exp_version_pair').on(table.experienceId, table.versionNumber)
  })
);

export const companyAiSummaries = pgTable(
  'company_ai_summaries',
  {
    id: text('id').primaryKey(),
    collegeId: text('college_id').notNull(),
    companyId: text('company_id')
      .notNull()
      .references(() => companies.id),
    companySummary: text('company_summary').notNull(),
    topTopics: jsonb('top_topics').$type<string[]>().notNull().default([]),
    difficultyDistribution: jsonb('difficulty_distribution').$type<Record<string, number>>().notNull().default({}),
    salaryDistribution: jsonb('salary_distribution').$type<Record<string, number>>().notNull().default({}),
    lastGeneratedAt: timestamp('last_generated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table: any) => ({
    tenantCompIdx: uniqueIndex('idx_ai_summary_tenant_comp').on(table.collegeId, table.companyId)
  })
);

export const placementBookmarks = pgTable(
  'placement_bookmarks',
  {
    id: text('id').primaryKey(),
    collegeId: text('college_id').notNull(),
    studentProfileId: text('student_profile_id').notNull(),
    targetType: text('target_type').notNull(), // 'COMPANY' | 'EXPERIENCE' | 'QUESTION' | 'THREAD'
    targetId: text('target_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table: any) => ({
    userBookmarkPairIdx: uniqueIndex('idx_user_bookmark_pair').on(
      table.collegeId,
      table.studentProfileId,
      table.targetType,
      table.targetId
    )
  })
);

export const placementAnalyticsEvents = pgTable(
  'placement_analytics_events',
  {
    id: text('id').primaryKey(),
    collegeId: text('college_id').notNull(),
    eventType: text('event_type').notNull(),
    targetId: text('target_id').notNull(),
    studentProfileId: text('student_profile_id').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table: any) => ({
    tenantEventIdx: index('idx_analytics_tenant_event').on(table.collegeId, table.eventType, table.targetId)
  })
);

export const interviewRounds = pgTable(
  'placement_interview_rounds',
  {
    id: text('id').primaryKey(),
    experienceId: text('experience_id')
      .notNull()
      .references(() => placementExperiences.id, { onDelete: 'cascade' }),
    roundNumber: integer('round_number').notNull(),
    roundName: text('round_name').notNull(),
    roundType: text('round_type').notNull(),
    durationMinutes: integer('duration_minutes').notNull().default(60),
    description: text('description').notNull(),
    topicsCovered: jsonb('topics_covered').$type<string[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table: any) => ({
    experienceIdx: index('idx_interview_rounds_exp').on(table.experienceId)
  })
);

export const interviewQuestions = pgTable(
  'placement_interview_questions',
  {
    id: text('id').primaryKey(),
    roundId: text('round_id')
      .notNull()
      .references(() => interviewRounds.id, { onDelete: 'cascade' }),
    questionText: text('question_text').notNull(),
    questionCategory: text('question_category').notNull().default('ALGORITHMS'),
    difficulty: text('difficulty').notNull().default('MEDIUM'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table: any) => ({
    roundIdx: index('idx_interview_questions_round').on(table.roundId)
  })
);

export const salaryInsights = pgTable(
  'placement_salary_insights',
  {
    id: text('id').primaryKey(),
    collegeId: text('college_id').notNull(),
    companyId: text('company_id')
      .notNull()
      .references(() => companies.id),
    roleTitle: text('role_title').notNull(),
    batchYear: integer('batch_year').notNull(),
    avgCtcLpa: numeric('avg_ctc_lpa', { precision: 6, scale: 2 }).notNull(),
    minCtcLpa: numeric('min_ctc_lpa', { precision: 6, scale: 2 }).notNull(),
    maxCtcLpa: numeric('max_ctc_lpa', { precision: 6, scale: 2 }).notNull(),
    sampleSize: integer('sample_size').notNull().default(1),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table: any) => ({
    tenantCompanyRoleYearIdx: uniqueIndex('idx_salary_tenant_comp_role_year').on(
      table.collegeId,
      table.companyId,
      table.roleTitle,
      table.batchYear
    )
  })
);

export const companyTags = pgTable(
  'placement_company_tags',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    tagName: text('tag_name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table: any) => ({
    companyTagIdx: uniqueIndex('idx_company_tag_pair').on(table.companyId, table.tagName)
  })
);
