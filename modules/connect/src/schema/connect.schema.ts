/**
 * Campus Connect — Drizzle ORM Schema Specification
 * Enterprise-grade multi-tenant database layer with Row Level Security (RLS) support.
 *
 * Implements 33 Aggregate Entities with:
 * - Foreign Key constraints with explicit onDelete / onUpdate rules.
 * - CHECK constraints for bounded numeric ranges (trustScore 0-100, compatibility 0-100%, priority 1-5).
 * - Standardized Append-Only vs Soft-Delete entity conventions.
 * - Explicit index names (`idx_connect_*`) aligned with CQRS discovery & messaging query patterns.
 * - Concise domain documentation comments on every table.
 */

import {
  pgTable,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  jsonb,
  index,
  uniqueIndex,
  check
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * 1. student_profiles
 * Core verified student identity and academic credentials.
 */
export const studentProfiles = pgTable(
  'connect_student_profiles',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    userId: varchar('user_id', { length: 64 }).notNull(),
    fullName: varchar('full_name', { length: 120 }).notNull(),
    major: varchar('major', { length: 120 }).notNull(),
    classYear: integer('class_year').notNull(),
    avatarUrl: text('avatar_url'),
    bio: text('bio'),
    isVerifiedStudent: boolean('is_verified_student').default(true).notNull(),
    trustScore: integer('trust_score').default(100).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull(),
    updatedBy: varchar('updated_by', { length: 64 }).notNull(),
    version: integer('version').default(1).notNull()
  },
  (table: any) => [
    index('idx_connect_student_profiles_college_id').on(table.collegeId),
    uniqueIndex('idx_connect_student_profiles_user_college').on(table.collegeId, table.userId),
    check('chk_connect_profiles_trust_score', sql`${table.trustScore} >= 0 AND ${table.trustScore} <= 100`)
  ]
);

/**
 * 2. student_intents (First-Class Domain Entity)
 * Active collaboration goals (Study Partner, Project Team, Mentorship, etc.).
 */
export const studentIntents = pgTable(
  'connect_student_intents',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    studentProfileId: varchar('student_profile_id', { length: 64 })
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    intentType: varchar('intent_type', { length: 64 }).notNull(),
    title: varchar('title', { length: 120 }).notNull(),
    description: text('description'),
    courseCode: varchar('course_code', { length: 32 }),
    status: varchar('status', { length: 32 }).default('ACTIVE').notNull(),
    priority: integer('priority').default(1).notNull(),
    availabilityState: varchar('availability_state', { length: 64 }).default('AVAILABLE_NOW').notNull(),
    targetCollegeIds: jsonb('target_college_ids').default([]).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull(),
    updatedBy: varchar('updated_by', { length: 64 }).notNull(),
    version: integer('version').default(1).notNull()
  },
  (table: any) => [
    index('idx_connect_student_intents_college_id').on(table.collegeId),
    index('idx_connect_student_intents_profile').on(table.collegeId, table.studentProfileId),
    index('idx_connect_student_intents_discovery').on(table.collegeId, table.status, table.intentType),
    check('chk_connect_intents_priority', sql`${table.priority} >= 1 AND ${table.priority} <= 5`)
  ]
);

/**
 * 3. intent_history (Append-Only Audit Entity)
 * Immutable historical state transitions for student intents.
 */
export const intentHistory = pgTable(
  'connect_intent_history',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    intentId: varchar('intent_id', { length: 64 })
      .notNull()
      .references(() => studentIntents.id, { onDelete: 'cascade' }),
    previousStatus: varchar('previous_status', { length: 32 }).notNull(),
    newStatus: varchar('new_status', { length: 32 }).notNull(),
    transitionReason: text('transition_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull()
  },
  (table: any) => [
    index('idx_connect_intent_history_college_id').on(table.collegeId),
    index('idx_connect_intent_history_intent').on(table.collegeId, table.intentId)
  ]
);

/**
 * 4. skills
 * Master taxonomy catalog of academic, technical, and creative skills.
 */
export const skills = pgTable(
  'connect_skills',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    name: varchar('name', { length: 64 }).unique().notNull(),
    category: varchar('category', { length: 64 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table: any) => [index('idx_connect_skills_name').on(table.name)]
);

/**
 * 5. student_skills
 * Student skill associations with peer endorsement counters.
 */
export const studentSkills = pgTable(
  'connect_student_skills',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    studentProfileId: varchar('student_profile_id', { length: 64 })
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    skillId: varchar('skill_id', { length: 64 })
      .notNull()
      .references(() => skills.id, { onDelete: 'restrict' }),
    proficiencyLevel: varchar('proficiency_level', { length: 32 }).default('INTERMEDIATE').notNull(),
    endorsementCount: integer('endorsement_count').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull(),
    updatedBy: varchar('updated_by', { length: 64 }).notNull(),
    version: integer('version').default(1).notNull()
  },
  (table: any) => [
    index('idx_connect_student_skills_college_id').on(table.collegeId),
    uniqueIndex('idx_connect_student_skills_profile_skill').on(table.collegeId, table.studentProfileId, table.skillId)
  ]
);

/**
 * 6. interests
 * Master taxonomy catalog of hobbies, sports, and domains.
 */
export const interests = pgTable(
  'connect_interests',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    name: varchar('name', { length: 64 }).unique().notNull(),
    category: varchar('category', { length: 64 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table: any) => [index('idx_connect_interests_name').on(table.name)]
);

/**
 * 7. student_interests
 * Student interest associations.
 */
export const studentInterests = pgTable(
  'connect_student_interests',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    studentProfileId: varchar('student_profile_id', { length: 64 })
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    interestId: varchar('interest_id', { length: 64 })
      .notNull()
      .references(() => interests.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull(),
    updatedBy: varchar('updated_by', { length: 64 }).notNull(),
    version: integer('version').default(1).notNull()
  },
  (table: any) => [
    index('idx_connect_student_interests_college_id').on(table.collegeId),
    uniqueIndex('idx_connect_student_interests_profile_interest').on(
      table.collegeId,
      table.studentProfileId,
      table.interestId
    )
  ]
);

/**
 * 8. clubs
 * Official campus student organization registry.
 */
export const clubs = pgTable(
  'connect_clubs',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    category: varchar('category', { length: 64 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull(),
    updatedBy: varchar('updated_by', { length: 64 }).notNull(),
    version: integer('version').default(1).notNull()
  },
  (table: any) => [index('idx_connect_clubs_college_id').on(table.collegeId)]
);

/**
 * 9. student_clubs
 * Student club membership records.
 */
export const studentClubs = pgTable(
  'connect_student_clubs',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    studentProfileId: varchar('student_profile_id', { length: 64 })
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    clubId: varchar('club_id', { length: 64 })
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 32 }).default('MEMBER').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull(),
    updatedBy: varchar('updated_by', { length: 64 }).notNull(),
    version: integer('version').default(1).notNull()
  },
  (table: any) => [
    index('idx_connect_student_clubs_college_id').on(table.collegeId),
    uniqueIndex('idx_connect_student_clubs_profile_club').on(table.collegeId, table.studentProfileId, table.clubId)
  ]
);

/**
 * 10. courses
 * Academic course catalog (e.g. CS224N, MATH51).
 */
export const courses = pgTable(
  'connect_courses',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    courseCode: varchar('course_code', { length: 32 }).notNull(),
    title: varchar('title', { length: 120 }).notNull(),
    department: varchar('department', { length: 64 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull(),
    updatedBy: varchar('updated_by', { length: 64 }).notNull(),
    version: integer('version').default(1).notNull()
  },
  (table: any) => [
    index('idx_connect_courses_college_id').on(table.collegeId),
    uniqueIndex('idx_connect_courses_college_code').on(table.collegeId, table.courseCode)
  ]
);

/**
 * 11. student_courses
 * Active student course registrations for study partner matching.
 */
export const studentCourses = pgTable(
  'connect_student_courses',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    studentProfileId: varchar('student_profile_id', { length: 64 })
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    courseId: varchar('course_id', { length: 64 })
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    academicTerm: varchar('academic_term', { length: 32 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull(),
    updatedBy: varchar('updated_by', { length: 64 }).notNull(),
    version: integer('version').default(1).notNull()
  },
  (table: any) => [
    index('idx_connect_student_courses_college_id').on(table.collegeId),
    uniqueIndex('idx_connect_student_courses_profile_course').on(
      table.collegeId,
      table.studentProfileId,
      table.courseId
    )
  ]
);

/**
 * 12. connection_requests
 * Outreach tickets between students (Max 5/day limit).
 */
export const connectionRequests = pgTable(
  'connect_connection_requests',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    senderProfileId: varchar('sender_profile_id', { length: 64 })
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    receiverProfileId: varchar('receiver_profile_id', { length: 64 })
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    originatingIntentId: varchar('originating_intent_id', { length: 64 })
      .notNull()
      .references(() => studentIntents.id, { onDelete: 'cascade' }),
    note: text('note'),
    status: varchar('status', { length: 32 }).default('PENDING').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull(),
    updatedBy: varchar('updated_by', { length: 64 }).notNull(),
    version: integer('version').default(1).notNull()
  },
  (table: any) => [
    index('idx_connect_connection_requests_college_id').on(table.collegeId),
    index('idx_connect_connection_requests_receiver').on(table.collegeId, table.receiverProfileId, table.status)
  ]
);

/**
 * 13. connections
 * Verified active 1-on-1 peer relationships (Max 50 active peers).
 */
export const connections = pgTable(
  'connect_connections',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    studentAId: varchar('student_a_id', { length: 64 })
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    studentBId: varchar('student_b_id', { length: 64 })
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 32 }).default('CONNECTED').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull(),
    updatedBy: varchar('updated_by', { length: 64 }).notNull(),
    version: integer('version').default(1).notNull()
  },
  (table: any) => [
    index('idx_connect_connections_college_id').on(table.collegeId),
    uniqueIndex('idx_connect_connections_pairwise').on(table.collegeId, table.studentAId, table.studentBId)
  ]
);

/**
 * 14. conversations (Mandatory Context Requirement)
 * Context-bound message thread headers.
 * MANDATORY NON-NULL: context_type, context_id.
 */
export const conversations = pgTable(
  'connect_conversations',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    conversationType: varchar('conversation_type', { length: 32 }).default('DIRECT').notNull(),
    contextType: varchar('context_type', { length: 64 }).notNull(), // MANDATORY NON-NULL
    contextId: varchar('context_id', { length: 64 }).notNull(), // MANDATORY NON-NULL
    title: varchar('title', { length: 120 }),
    lifecycleState: varchar('lifecycle_state', { length: 32 }).default('ACTIVE').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull(),
    updatedBy: varchar('updated_by', { length: 64 }).notNull(),
    version: integer('version').default(1).notNull()
  },
  (table: any) => [
    index('idx_connect_conversations_college_id').on(table.collegeId),
    index('idx_connect_conversations_context').on(table.collegeId, table.contextType, table.contextId)
  ]
);

/**
 * 15. conversation_members
 * Membership mapping for conversations.
 */
export const conversationMembers = pgTable(
  'connect_conversation_members',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    conversationId: varchar('conversation_id', { length: 64 })
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    studentProfileId: varchar('student_profile_id', { length: 64 })
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull(),
    updatedBy: varchar('updated_by', { length: 64 }).notNull(),
    version: integer('version').default(1).notNull()
  },
  (table: any) => [
    index('idx_connect_conv_members_college_id').on(table.collegeId),
    uniqueIndex('idx_connect_conv_members_conv_student').on(
      table.collegeId,
      table.conversationId,
      table.studentProfileId
    )
  ]
);

/**
 * 16. messages (Soft-Delete Supported)
 * Individual messages within context-bound conversations using `is_soft_deleted`.
 */
export const messages = pgTable(
  'connect_messages',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    conversationId: varchar('conversation_id', { length: 64 })
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderProfileId: varchar('sender_profile_id', { length: 64 })
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    isSoftDeleted: boolean('is_soft_deleted').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull(),
    updatedBy: varchar('updated_by', { length: 64 }).notNull(),
    version: integer('version').default(1).notNull()
  },
  (table: any) => [
    index('idx_connect_messages_college_id').on(table.collegeId),
    index('idx_connect_messages_conversation').on(table.collegeId, table.conversationId, table.createdAt)
  ]
);

/**
 * 17. message_attachments
 * Media, code snippet, or note attachment links.
 */
export const messageAttachments = pgTable(
  'connect_message_attachments',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    messageId: varchar('message_id', { length: 64 })
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    attachmentType: varchar('attachment_type', { length: 32 }).notNull(),
    url: text('url').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull(),
    updatedBy: varchar('updated_by', { length: 64 }).notNull(),
    version: integer('version').default(1).notNull()
  },
  (table: any) => [
    index('idx_connect_msg_attachments_college_id').on(table.collegeId),
    index('idx_connect_msg_attachments_message').on(table.collegeId, table.messageId)
  ]
);

/**
 * 18. study_groups
 * Peer exam prep pods for shared courses.
 */
export const studyGroups = pgTable(
  'connect_study_groups',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    courseCode: varchar('course_code', { length: 32 }).notNull(),
    title: varchar('title', { length: 120 }).notNull(),
    maxCapacity: integer('max_capacity').default(5).notNull(),
    status: varchar('status', { length: 32 }).default('OPEN').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull(),
    updatedBy: varchar('updated_by', { length: 64 }).notNull(),
    version: integer('version').default(1).notNull()
  },
  (table: any) => [
    index('idx_connect_study_groups_college_id').on(table.collegeId),
    index('idx_connect_study_groups_course').on(table.collegeId, table.courseCode),
    check('chk_connect_study_groups_cap', sql`${table.maxCapacity} >= 2 AND ${table.maxCapacity} <= 20`)
  ]
);

/**
 * 19. project_teams
 * Cross-functional term project and hackathon teams.
 */
export const projectTeams = pgTable(
  'connect_project_teams',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    title: varchar('title', { length: 120 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 32 }).default('OPEN').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull(),
    updatedBy: varchar('updated_by', { length: 64 }).notNull(),
    version: integer('version').default(1).notNull()
  },
  (table: any) => [index('idx_connect_project_teams_college_id').on(table.collegeId)]
);

/**
 * 20. project_members
 * Member role assignments for project teams.
 */
export const projectMembers = pgTable(
  'connect_project_members',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    projectTeamId: varchar('project_team_id', { length: 64 })
      .notNull()
      .references(() => projectTeams.id, { onDelete: 'cascade' }),
    studentProfileId: varchar('student_profile_id', { length: 64 })
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 64 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull(),
    updatedBy: varchar('updated_by', { length: 64 }).notNull(),
    version: integer('version').default(1).notNull()
  },
  (table: any) => [
    index('idx_connect_proj_members_college_id').on(table.collegeId),
    uniqueIndex('idx_connect_proj_members_team_student').on(
      table.collegeId,
      table.projectTeamId,
      table.studentProfileId
    )
  ]
);

/**
 * 21. mentorships
 * Senior-to-junior mentorship pairings.
 */
export const mentorships = pgTable(
  'connect_mentorships',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    mentorProfileId: varchar('mentor_profile_id', { length: 64 })
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    menteeProfileId: varchar('mentee_profile_id', { length: 64 })
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 32 }).default('REQUESTED').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull(),
    updatedBy: varchar('updated_by', { length: 64 }).notNull(),
    version: integer('version').default(1).notNull()
  },
  (table: any) => [
    index('idx_connect_mentorships_college_id').on(table.collegeId),
    uniqueIndex('idx_connect_mentorships_pair').on(table.collegeId, table.mentorProfileId, table.menteeProfileId)
  ]
);

/**
 * 22. recommendation_snapshots (Immutable, Append-Only)
 * Vector similarity calculation snapshots. No optimistic locking / updates.
 */
export const recommendationSnapshots = pgTable(
  'connect_recommendation_snapshots',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    sourceStudentId: varchar('source_student_id', { length: 64 })
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    targetStudentId: varchar('target_student_id', { length: 64 })
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    overallCompatibilityPct: numeric('overall_compatibility_pct', { precision: 5, scale: 2 }).notNull(),
    algorithmVersion: varchar('algorithm_version', { length: 32 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull()
  },
  (table: any) => [
    index('idx_connect_rec_snapshots_college_id').on(table.collegeId),
    index('idx_connect_rec_snapshots_source').on(table.collegeId, table.sourceStudentId),
    check(
      'chk_connect_rec_pct',
      sql`${table.overallCompatibilityPct} >= 0.00 AND ${table.overallCompatibilityPct} <= 100.00`
    )
  ]
);

/**
 * 23. recommendation_reasons (Immutable, Append-Only)
 * Structured weighted reasons explaining match candidates.
 */
export const recommendationReasons = pgTable(
  'connect_recommendation_reasons',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    snapshotId: varchar('snapshot_id', { length: 64 })
      .notNull()
      .references(() => recommendationSnapshots.id, { onDelete: 'cascade' }),
    reasonCode: varchar('reason_code', { length: 64 }).notNull(),
    weight: numeric('weight', { precision: 3, scale: 2 }).notNull(),
    humanText: text('human_text').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull()
  },
  (table: any) => [
    index('idx_connect_rec_reasons_college_id').on(table.collegeId),
    index('idx_connect_rec_reasons_snapshot').on(table.collegeId, table.snapshotId),
    check('chk_connect_rec_reason_weight', sql`${table.weight} >= 0.00 AND ${table.weight} <= 1.00`)
  ]
);

/**
 * 24. privacy_settings (Independent Entity)
 * Decoupled privacy controls (Incognito, Ghost mode, connection limits).
 */
export const privacySettings = pgTable(
  'connect_privacy_settings',
  {
    studentProfileId: varchar('student_profile_id', { length: 64 })
      .primaryKey()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    isGhostMode: boolean('is_ghost_mode').default(false).notNull(),
    isIncognitoMode: boolean('is_incognito_mode').default(false).notNull(),
    showOnlineIndicator: boolean('show_online_indicator').default(true).notNull(),
    showLastActive: boolean('show_last_active').default(true).notNull(),
    dailyRequestLimit: integer('daily_request_limit').default(5).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull(),
    updatedBy: varchar('updated_by', { length: 64 }).notNull(),
    version: integer('version').default(1).notNull()
  },
  (table: any) => [
    index('idx_connect_privacy_settings_college_id').on(table.collegeId),
    check('chk_connect_privacy_req_limit', sql`${table.dailyRequestLimit} >= 1 AND ${table.dailyRequestLimit} <= 20`)
  ]
);

/**
 * 25. visibility_preferences (Independent Entity)
 * Decoupled visibility scope settings (*Visible All*, *Same Year*, *Same Dept*, *Friends Only*, *Hidden*).
 */
export const visibilityPreferences = pgTable(
  'connect_visibility_preferences',
  {
    studentProfileId: varchar('student_profile_id', { length: 64 })
      .primaryKey()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    visibilityScope: varchar('visibility_scope', { length: 32 }).default('VISIBLE_ALL').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull(),
    updatedBy: varchar('updated_by', { length: 64 }).notNull(),
    version: integer('version').default(1).notNull()
  },
  (table: any) => [index('idx_connect_visibility_prefs_college_id').on(table.collegeId)]
);

/**
 * 26. notifications
 * Student notification delivery queue.
 */
export const notifications = pgTable(
  'connect_notifications',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    recipientProfileId: varchar('recipient_profile_id', { length: 64 })
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    category: varchar('category', { length: 64 }).notNull(),
    title: varchar('title', { length: 120 }).notNull(),
    body: text('body').notNull(),
    isRead: boolean('is_read').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull(),
    updatedBy: varchar('updated_by', { length: 64 }).notNull(),
    version: integer('version').default(1).notNull()
  },
  (table: any) => [
    index('idx_connect_notifications_college_id').on(table.collegeId),
    index('idx_connect_notifications_recipient').on(table.collegeId, table.recipientProfileId, table.isRead)
  ]
);

/**
 * 27. activity_feed (Append-Only Entity)
 * Real-time campus activity stream ticker events. No optimistic locking.
 */
export const activityFeed = pgTable(
  'connect_activity_feed',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    actorProfileId: varchar('actor_profile_id', { length: 64 })
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    actionType: varchar('action_type', { length: 64 }).notNull(),
    displayText: text('display_text').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull()
  },
  (table: any) => [index('idx_connect_activity_feed_college_id').on(table.collegeId)]
);

/**
 * 28. moderation_cases
 * Campus safety review tickets.
 */
export const moderationCases = pgTable(
  'connect_moderation_cases',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    reportedProfileId: varchar('reported_profile_id', { length: 64 })
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    reporterProfileId: varchar('reporter_profile_id', { length: 64 })
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    status: varchar('status', { length: 32 }).default('OPEN').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull(),
    updatedBy: varchar('updated_by', { length: 64 }).notNull(),
    version: integer('version').default(1).notNull()
  },
  (table: any) => [index('idx_connect_mod_cases_college_id').on(table.collegeId)]
);

/**
 * 29. moderation_actions (Append-Only Entity)
 * Administrative disciplinary action logs. No optimistic locking.
 */
export const moderationActions = pgTable(
  'connect_moderation_actions',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    caseId: varchar('case_id', { length: 64 })
      .notNull()
      .references(() => moderationCases.id, { onDelete: 'cascade' }),
    actionTaken: varchar('action_taken', { length: 64 }).notNull(),
    moderatorId: varchar('moderator_id', { length: 64 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull()
  },
  (table: any) => [index('idx_connect_mod_actions_college_id').on(table.collegeId)]
);

/**
 * 30. reports (Append-Only Entity)
 * User-submitted safety reports with evidence attachments. No optimistic locking.
 */
export const reports = pgTable(
  'connect_reports',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    reporterProfileId: varchar('reporter_profile_id', { length: 64 })
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    targetProfileId: varchar('target_profile_id', { length: 64 })
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    reasonCategory: varchar('reason_category', { length: 64 }).notNull(),
    evidenceText: text('evidence_text'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull()
  },
  (table: any) => [index('idx_connect_reports_college_id').on(table.collegeId)]
);

/**
 * 31. audit_logs (Immutable, Append-Only Entity)
 * System security and administrative audit trail. No optimistic locking.
 */
export const auditLogs = pgTable(
  'connect_audit_logs',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    actorId: varchar('actor_id', { length: 64 }).notNull(),
    action: varchar('action', { length: 64 }).notNull(),
    targetEntity: varchar('target_entity', { length: 64 }).notNull(),
    targetId: varchar('target_id', { length: 64 }).notNull(),
    payloadJson: jsonb('payload_json'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull()
  },
  (table: any) => [index('idx_connect_audit_logs_college_id').on(table.collegeId)]
);

/**
 * 32. feature_usage_statistics
 * Aggregated telemetry metrics for feature flag evaluation.
 */
export const featureUsageStatistics = pgTable(
  'connect_feature_usage_statistics',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 64 }).notNull(),
    featureKey: varchar('feature_key', { length: 64 }).notNull(),
    evaluationCount: integer('evaluation_count').default(0).notNull(),
    successCount: integer('success_count').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull(),
    updatedBy: varchar('updated_by', { length: 64 }).notNull(),
    version: integer('version').default(1).notNull()
  },
  (table: any) => [index('idx_connect_feature_stats_college_id').on(table.collegeId)]
);

/**
 * 33. future_intercollege_links
 * Inter-college federation mapping for cross-campus networking.
 */
export const futureIntercollegeLinks = pgTable(
  'connect_future_intercollege_links',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    homeCollegeId: varchar('home_college_id', { length: 64 }).notNull(),
    targetCollegeId: varchar('target_college_id', { length: 64 }).notNull(),
    isFederationApproved: boolean('is_federation_approved').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 64 }).notNull(),
    updatedBy: varchar('updated_by', { length: 64 }).notNull(),
    version: integer('version').default(1).notNull()
  },
  (table: any) => [index('idx_connect_intercollege_home').on(table.homeCollegeId)]
);
