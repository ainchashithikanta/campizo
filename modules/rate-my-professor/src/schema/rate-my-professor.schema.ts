import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  text,
  numeric,
  timestamp,
  index,
  uniqueIndex
} from 'drizzle-orm/pg-core';

// Shared column fragments (defined locally to stay compatible with the
// workspace's drizzle-orm version — see packages/database base.ts)
const baseColumns = {
  id: uuid('id').defaultRandom().primaryKey(),
  version: integer('version').default(1).notNull() // Optimistic concurrency control counter
};

const auditColumns = {
  createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { mode: 'date', precision: 3 }) // Nullable for soft deletes
};

// 1. Departments Table
export const departments = pgTable(
  'departments',
  {
    ...baseColumns,
    collegeId: uuid('college_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    ...auditColumns
  },
  (table) => ({
    deptCollegeCodeIdx: uniqueIndex('dept_college_code_idx').on(table.collegeId, table.code),
    deptCollegeSlugIdx: uniqueIndex('dept_college_slug_idx').on(table.collegeId, table.slug)
  })
);

// 2. Professors Table
export const professors = pgTable(
  'professors',
  {
    ...baseColumns,
    collegeId: uuid('college_id').notNull(),
    departmentId: uuid('department_id')
      .references(() => departments.id, { onDelete: 'cascade' })
      .notNull(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    employeeCode: varchar('employee_code', { length: 100 }),
    designation: varchar('designation', { length: 100 }).notNull(),
    status: varchar('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, VISITING, RETIRED, ON_LEAVE
    biography: text('biography'),
    photoUrl: varchar('photo_url', { length: 500 }),
    officialEmail: varchar('official_email', { length: 255 }),
    ...auditColumns
  },
  (table) => ({
    profCollegeSlugIdx: uniqueIndex('prof_college_slug_idx').on(table.collegeId, table.slug),
    profDeptIdx: index('prof_dept_idx').on(table.collegeId, table.departmentId),
    profStatusIdx: index('prof_status_idx').on(table.collegeId, table.status)
  })
);

// 3. Professor Aliases Table
export const professorAliases = pgTable(
  'professor_aliases',
  {
    ...baseColumns,
    collegeId: uuid('college_id').notNull(),
    professorId: uuid('professor_id')
      .references(() => professors.id, { onDelete: 'cascade' })
      .notNull(),
    aliasName: varchar('alias_name', { length: 255 }).notNull()
  },
  (table) => ({
    profAliasIdx: index('prof_alias_idx').on(table.collegeId, table.aliasName)
  })
);

// 4. Subjects Table
export const subjects = pgTable(
  'subjects',
  {
    ...baseColumns,
    collegeId: uuid('college_id').notNull(),
    departmentId: uuid('department_id')
      .references(() => departments.id, { onDelete: 'cascade' })
      .notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    ...auditColumns
  },
  (table) => ({
    subjCollegeCodeIdx: uniqueIndex('subj_college_code_idx').on(table.collegeId, table.code)
  })
);

// 5. Courses Table
export const courses = pgTable(
  'courses',
  {
    ...baseColumns,
    collegeId: uuid('college_id').notNull(),
    subjectId: uuid('subject_id')
      .references(() => subjects.id, { onDelete: 'cascade' })
      .notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    credits: integer('credits').default(3).notNull(),
    ...auditColumns
  },
  (table) => ({
    courseCollegeCodeIdx: uniqueIndex('course_college_code_idx').on(table.collegeId, table.code)
  })
);

// 6. Professor Course Assignments
export const professorCourseAssignments = pgTable(
  'professor_course_assignments',
  {
    ...baseColumns,
    collegeId: uuid('college_id').notNull(),
    professorId: uuid('professor_id')
      .references(() => professors.id, { onDelete: 'cascade' })
      .notNull(),
    courseId: uuid('course_id')
      .references(() => courses.id, { onDelete: 'cascade' })
      .notNull(),
    academicYear: varchar('academic_year', { length: 20 }).notNull(), // e.g. "2024-25"
    semester: varchar('semester', { length: 50 }).notNull() // e.g. "5th Sem"
  },
  (table) => ({
    assignmentUniqueIdx: uniqueIndex('prof_course_assign_uniq_idx').on(
      table.collegeId,
      table.professorId,
      table.courseId,
      table.academicYear,
      table.semester
    )
  })
);

// 7. Professor Reviews Table
export const professorReviews = pgTable(
  'professor_reviews',
  {
    ...baseColumns,
    collegeId: uuid('college_id').notNull(),
    professorId: uuid('professor_id')
      .references(() => professors.id, { onDelete: 'cascade' })
      .notNull(),
    courseAssignmentId: uuid('course_assignment_id')
      .references(() => professorCourseAssignments.id, { onDelete: 'cascade' })
      .notNull(),
    authorUserId: uuid('author_user_id').notNull(),
    authorAnonymousToken: varchar('author_anonymous_token', { length: 255 }).notNull(),
    isAnonymous: boolean('is_anonymous').default(true).notNull(),
    gradeReceived: varchar('grade_received', { length: 10 }),
    reviewText: text('review_text').notNull(),
    overallRating: numeric('overall_rating', { precision: 3, scale: 2 }).notNull(),
    moderationStatus: varchar('moderation_status', { length: 50 }).default('APPROVED').notNull(), // PENDING, APPROVED, FLAGGED, REJECTED
    helpfulCount: integer('helpful_count').default(0).notNull(),
    unhelpfulCount: integer('unhelpful_count').default(0).notNull(),
    ...auditColumns
  },
  (table) => ({
    reviewProfStatusIdx: index('review_prof_status_idx').on(table.collegeId, table.professorId, table.moderationStatus),
    reviewAuthorTermIdx: uniqueIndex('review_author_term_uniq_idx').on(
      table.collegeId,
      table.professorId,
      table.authorUserId,
      table.courseAssignmentId
    )
  })
);

// 8. Review Rating Dimensions Table (Flexible Dynamic Dimension Scores)
export const reviewRatingDimensions = pgTable(
  'review_rating_dimensions',
  {
    ...baseColumns,
    collegeId: uuid('college_id').notNull(),
    reviewId: uuid('review_id')
      .references(() => professorReviews.id, { onDelete: 'cascade' })
      .notNull(),
    dimensionKey: varchar('dimension_key', { length: 100 }).notNull(), // teaching_clarity, grading_fairness, punctuality, approachability
    score: numeric('score', { precision: 3, scale: 2 }).notNull()
  },
  (table) => ({
    reviewDimUniqIdx: uniqueIndex('review_dim_uniq_idx').on(table.reviewId, table.dimensionKey)
  })
);

// 9. Review Votes Table (Helpful / Unhelpful)
export const reviewVotes = pgTable(
  'review_votes',
  {
    ...baseColumns,
    collegeId: uuid('college_id').notNull(),
    reviewId: uuid('review_id')
      .references(() => professorReviews.id, { onDelete: 'cascade' })
      .notNull(),
    voterUserId: uuid('voter_user_id').notNull(),
    voteType: varchar('vote_type', { length: 20 }).notNull(), // HELPFUL, UNHELPFUL
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull()
  },
  (table) => ({
    voteUserReviewUniqIdx: uniqueIndex('vote_user_review_uniq_idx').on(table.reviewId, table.voterUserId)
  })
);

// 10. Review Reports Table
export const reviewReports = pgTable(
  'review_reports',
  {
    ...baseColumns,
    collegeId: uuid('college_id').notNull(),
    reviewId: uuid('review_id')
      .references(() => professorReviews.id, { onDelete: 'cascade' })
      .notNull(),
    reporterUserId: uuid('reporter_user_id').notNull(),
    reason: varchar('reason', { length: 100 }).notNull(), // SPAM, ABUSE, HARASSMENT, FALSE_INFORMATION, OTHER
    details: text('details'),
    status: varchar('status', { length: 50 }).default('PENDING').notNull(), // PENDING, RESOLVED, DISMISSED
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull()
  },
  (table) => ({
    reportUserReviewUniqIdx: uniqueIndex('report_user_review_uniq_idx').on(table.reviewId, table.reporterUserId)
  })
);

// 11. Review Moderation Logs Table
export const reviewModerationLogs = pgTable(
  'review_moderation_logs',
  {
    ...baseColumns,
    collegeId: uuid('college_id').notNull(),
    reviewId: uuid('review_id')
      .references(() => professorReviews.id, { onDelete: 'cascade' })
      .notNull(),
    moderatorUserId: uuid('moderator_user_id').notNull(),
    action: varchar('action', { length: 50 }).notNull(), // APPROVE, HIDE, REJECT, RESTORE
    reason: text('reason').notNull(),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull()
  },
  (table) => ({
    modLogReviewIdx: index('mod_log_review_idx').on(table.collegeId, table.reviewId)
  })
);

// 12. Review Histories Table (24-Hour Edit Log)
export const reviewHistories = pgTable(
  'review_histories',
  {
    ...baseColumns,
    collegeId: uuid('college_id').notNull(),
    reviewId: uuid('review_id')
      .references(() => professorReviews.id, { onDelete: 'cascade' })
      .notNull(),
    previousText: text('previous_text').notNull(),
    previousOverallRating: numeric('previous_overall_rating', { precision: 3, scale: 2 }).notNull(),
    editedAt: timestamp('edited_at', { mode: 'date', precision: 3 }).defaultNow().notNull()
  },
  (table) => ({
    reviewHistoryIdx: index('review_history_idx').on(table.collegeId, table.reviewId)
  })
);

// 13. Faculty Responses Table
export const facultyResponses = pgTable(
  'faculty_responses',
  {
    ...baseColumns,
    collegeId: uuid('college_id').notNull(),
    reviewId: uuid('review_id')
      .references(() => professorReviews.id, { onDelete: 'cascade' })
      .notNull(),
    professorUserId: uuid('professor_user_id').notNull(),
    responseText: text('response_text').notNull(),
    ...auditColumns
  },
  (table) => ({
    facultyResponseReviewUniqIdx: uniqueIndex('faculty_resp_review_uniq_idx').on(table.reviewId)
  })
);

// 14. Professor Statistics Table (Pre-Aggregated Read Model)
export const professorStatistics = pgTable(
  'professor_statistics',
  {
    professorId: uuid('professor_id')
      .references(() => professors.id, { onDelete: 'cascade' })
      .primaryKey(),
    collegeId: uuid('college_id').notNull(),
    bayesianRating: numeric('bayesian_rating', { precision: 3, scale: 2 }).default('0.00').notNull(),
    rawAverageRating: numeric('raw_average_rating', { precision: 3, scale: 2 }).default('0.00').notNull(),
    totalReviewsCount: integer('total_reviews_count').default(0).notNull(),
    recommendationPercentage: numeric('recommendation_percentage', { precision: 5, scale: 2 })
      .default('0.00')
      .notNull(),
    star5Count: integer('star_5_count').default(0).notNull(),
    star4Count: integer('star_4_count').default(0).notNull(),
    star3Count: integer('star_3_count').default(0).notNull(),
    star2Count: integer('star_2_count').default(0).notNull(),
    star1Count: integer('star_1_count').default(0).notNull(),
    lastCalculatedAt: timestamp('last_calculated_at', { mode: 'date', precision: 3 }).defaultNow().notNull()
  },
  (table) => ({
    profStatsBayesianIdx: index('prof_stats_bayesian_idx').on(table.collegeId, table.bayesianRating)
  })
);
