import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  bigint,
  boolean,
  numeric,
  timestamp,
  primaryKey,
  uniqueIndex,
  index
} from 'drizzle-orm/pg-core';
import { baseColumns, auditColumns } from '@college-hub/database';

/**
 * 1. Reference: Academic Schemes (Syllabus Regulations e.g. 2021 Scheme)
 */
export const academicSchemes = pgTable(
  'academic_schemes',
  {
    ...baseColumns,
    code: varchar('code', { length: 32 }).notNull(),
    title: varchar('title', { length: 128 }).notNull(),
    effectiveYear: integer('effective_year').notNull(),
    ...auditColumns
  },
  (table) => ({
    codeIdx: uniqueIndex('academic_schemes_code_idx').on(table.code)
  })
);

/**
 * 2. Reference: Exam Types (MID_SEM, END_SEM, LAB_VIVA)
 */
export const examTypes = pgTable(
  'exam_types',
  {
    ...baseColumns,
    code: varchar('code', { length: 32 }).notNull(),
    displayLabel: varchar('display_label', { length: 64 }).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    ...auditColumns
  },
  (table) => ({
    codeIdx: uniqueIndex('exam_types_code_idx').on(table.code)
  })
);

/**
 * 3. Reference: Resource Material Types (PYQ, LECTURE_NOTES, LAB_MANUAL, FORMULA_SHEET)
 */
export const resourceTypes = pgTable(
  'resource_types',
  {
    ...baseColumns,
    code: varchar('code', { length: 32 }).notNull(),
    displayLabel: varchar('display_label', { length: 64 }).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    ...auditColumns
  },
  (table) => ({
    codeIdx: uniqueIndex('resource_types_code_idx').on(table.code)
  })
);

/**
 * 4. Multi-Tenant: Colleges (Institutions)
 */
export const colleges = pgTable(
  'colleges',
  {
    ...baseColumns,
    name: varchar('name', { length: 256 }).notNull(),
    slug: varchar('slug', { length: 128 }).notNull(),
    ...auditColumns
  },
  (table) => ({
    slugIdx: uniqueIndex('colleges_slug_idx').on(table.slug)
  })
);

/**
 * 5. Multi-Tenant: Departments
 */
export const departments = pgTable(
  'departments',
  {
    ...baseColumns,
    collegeId: uuid('college_id').notNull().references(() => colleges.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 32 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    ...auditColumns
  },
  (table) => ({
    collegeCodeIdx: uniqueIndex('departments_college_code_idx').on(table.collegeId, table.code)
  })
);

/**
 * 6. Multi-Tenant: Subjects
 */
export const subjects = pgTable(
  'subjects',
  {
    ...baseColumns,
    collegeId: uuid('college_id').notNull().references(() => colleges.id, { onDelete: 'cascade' }),
    departmentId: uuid('department_id').notNull().references(() => departments.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 32 }).notNull(),
    name: varchar('name', { length: 256 }).notNull(),
    semesterNumber: integer('semester_number').notNull(),
    ...auditColumns
  },
  (table) => ({
    collegeCodeIdx: uniqueIndex('subjects_college_code_idx').on(table.collegeId, table.code),
    collegeSemIdx: index('subjects_college_sem_idx').on(table.collegeId, table.semesterNumber)
  })
);

/**
 * 7. Courses (Degree Programs / Specializations)
 */
export const courses = pgTable(
  'courses',
  {
    ...baseColumns,
    collegeId: uuid('college_id').notNull().references(() => colleges.id, { onDelete: 'cascade' }),
    departmentId: uuid('department_id').notNull().references(() => departments.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 32 }).notNull(),
    title: varchar('title', { length: 256 }).notNull(),
    ...auditColumns
  },
  (table) => ({
    collegeCodeIdx: uniqueIndex('courses_college_code_idx').on(table.collegeId, table.code)
  })
);

/**
 * 8. Core Logical Entity: Academic Resources
 */
export const academicResources = pgTable(
  'academic_resources',
  {
    ...baseColumns,
    collegeId: uuid('college_id').notNull().references(() => colleges.id, { onDelete: 'cascade' }),
    departmentId: uuid('department_id').notNull().references(() => departments.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id').references(() => courses.id, { onDelete: 'set null' }),
    schemeId: uuid('scheme_id').references(() => academicSchemes.id, { onDelete: 'set null' }),
    examTypeId: uuid('exam_type_id').references(() => examTypes.id, { onDelete: 'set null' }),
    resourceTypeId: uuid('resource_type_id').notNull().references(() => resourceTypes.id, { onDelete: 'restrict' }),
    uploaderUserId: uuid('uploader_user_id').notNull(),
    title: varchar('title', { length: 256 }).notNull(),
    slug: varchar('slug', { length: 300 }).notNull(),
    description: text('description'),
    academicYear: varchar('academic_year', { length: 16 }).notNull(),
    semesterNumber: integer('semester_number').notNull(),
    isAnonymous: boolean('is_anonymous').default(false).notNull(),
    authorDisplayName: varchar('author_display_name', { length: 128 }),
    status: varchar('status', { length: 32 }).default('APPROVED').notNull(), // PENDING, APPROVED, QUARANTINED, REJECTED
    verificationStatus: varchar('verification_status', { length: 32 }).default('UNVERIFIED').notNull(), // UNVERIFIED, STUDENT_VERIFIED, FACULTY_VERIFIED
    currentVersionId: uuid('current_version_id'),
    ...auditColumns
  },
  (table) => ({
    collegeSubjectStatusIdx: index('academic_resources_college_subject_status_idx').on(
      table.collegeId,
      table.subjectId,
      table.status
    ),
    collegeUploaderIdx: index('academic_resources_college_uploader_idx').on(table.collegeId, table.uploaderUserId)
  })
);

/**
 * 9. Resource Versions (Immutable Lineage)
 */
export const resourceVersions = pgTable(
  'resource_versions',
  {
    ...baseColumns,
    resourceId: uuid('resource_id').notNull().references(() => academicResources.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    changelogNotes: text('changelog_notes'),
    createdByUserId: uuid('created_by_user_id').notNull(),
    ...auditColumns
  },
  (table) => ({
    resourceVersionIdx: uniqueIndex('resource_versions_resource_version_idx').on(table.resourceId, table.versionNumber)
  })
);

/**
 * 10. Resource Files (Binary Metadata & Storage Key Locators)
 */
export const resourceFiles = pgTable(
  'resource_files',
  {
    ...baseColumns,
    versionId: uuid('version_id').notNull().references(() => resourceVersions.id, { onDelete: 'cascade' }),
    storageProvider: varchar('storage_provider', { length: 32 }).default('S3').notNull(),
    storageKey: varchar('storage_key', { length: 512 }).notNull(),
    fileName: varchar('file_name', { length: 256 }).notNull(),
    fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }).notNull(),
    mimeType: varchar('mime_type', { length: 128 }).notNull(),
    sha256Hash: varchar('sha256_hash', { length: 64 }).notNull(),
    pageCount: integer('page_count'),
    hasPreview: boolean('has_preview').default(false).notNull(),
    virusScanStatus: varchar('virus_scan_status', { length: 32 }).default('CLEAN').notNull(),
    ...auditColumns
  },
  (table) => ({
    hashIdx: index('resource_files_sha256_hash_idx').on(table.sha256Hash),
    versionIdx: index('resource_files_version_idx').on(table.versionId)
  })
);

/**
 * 11. Study Collections ("Exam Survival Kits")
 */
export const studyCollections = pgTable(
  'study_collections',
  {
    ...baseColumns,
    collegeId: uuid('college_id').notNull().references(() => colleges.id, { onDelete: 'cascade' }),
    ownerUserId: uuid('owner_user_id').notNull(),
    title: varchar('title', { length: 256 }).notNull(),
    description: text('description'),
    isPublic: boolean('is_public').default(true).notNull(),
    ...auditColumns
  },
  (table) => ({
    collegeOwnerIdx: index('study_collections_college_owner_idx').on(table.collegeId, table.ownerUserId)
  })
);

/**
 * 12. Collection Resources (Join Table with Positional Ordering)
 */
export const collectionResources = pgTable(
  'collection_resources',
  {
    collectionId: uuid('collection_id').notNull().references(() => studyCollections.id, { onDelete: 'cascade' }),
    resourceId: uuid('resource_id').notNull().references(() => academicResources.id, { onDelete: 'cascade' }),
    positionOrder: integer('position_order').default(0).notNull(),
    sectionHeader: varchar('section_header', { length: 128 }),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.collectionId, table.resourceId] })
  })
);

/**
 * 13. Resource Relationships Graph (SOLUTION_FOR, LAB_FOR, REPLACEMENT_OF)
 */
export const resourceRelationships = pgTable(
  'resource_relationships',
  {
    ...baseColumns,
    sourceResourceId: uuid('source_resource_id').notNull().references(() => academicResources.id, { onDelete: 'cascade' }),
    targetResourceId: uuid('target_resource_id').notNull().references(() => academicResources.id, { onDelete: 'cascade' }),
    relationshipType: varchar('relationship_type', { length: 64 }).notNull(),
    ...auditColumns
  },
  (table) => ({
    relationshipUniqueIdx: uniqueIndex('resource_relationships_unique_idx').on(
      table.sourceResourceId,
      table.targetResourceId,
      table.relationshipType
    )
  })
);

/**
 * 14. Resource Votes (Helpful / Unhelpful)
 */
export const resourceVotes = pgTable(
  'resource_votes',
  {
    collegeId: uuid('college_id').notNull().references(() => colleges.id, { onDelete: 'cascade' }),
    resourceId: uuid('resource_id').notNull().references(() => academicResources.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    voteType: varchar('vote_type', { length: 16 }).notNull(), // HELPFUL, UNHELPFUL
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.resourceId, table.userId] })
  })
);

/**
 * 15. Resource Bookmarks
 */
export const resourceBookmarks = pgTable(
  'resource_bookmarks',
  {
    collegeId: uuid('college_id').notNull().references(() => colleges.id, { onDelete: 'cascade' }),
    resourceId: uuid('resource_id').notNull().references(() => academicResources.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.resourceId, table.userId] })
  })
);

/**
 * 16. Resource Downloads (Append-Only Audit Log)
 */
export const resourceDownloads = pgTable(
  'resource_downloads',
  {
    ...baseColumns,
    collegeId: uuid('college_id').notNull().references(() => colleges.id, { onDelete: 'cascade' }),
    resourceId: uuid('resource_id').notNull().references(() => academicResources.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    ipAddress: varchar('ip_address', { length: 64 }),
    downloadedAt: timestamp('downloaded_at', { mode: 'date', precision: 3 }).defaultNow().notNull()
  },
  (table) => ({
    collegeResourceIdx: index('resource_downloads_college_resource_idx').on(table.collegeId, table.resourceId)
  })
);

/**
 * 17. Resource Views (Append-Only Audit Log)
 */
export const resourceViews = pgTable(
  'resource_views',
  {
    ...baseColumns,
    collegeId: uuid('college_id').notNull().references(() => colleges.id, { onDelete: 'cascade' }),
    resourceId: uuid('resource_id').notNull().references(() => academicResources.id, { onDelete: 'cascade' }),
    userId: uuid('user_id'),
    ipAddress: varchar('ip_address', { length: 64 }),
    viewedAt: timestamp('viewed_at', { mode: 'date', precision: 3 }).defaultNow().notNull()
  },
  (table) => ({
    collegeResourceIdx: index('resource_views_college_resource_idx').on(table.collegeId, table.resourceId)
  })
);

/**
 * 18. Resource Reports (Community Violations)
 */
export const resourceReports = pgTable(
  'resource_reports',
  {
    ...baseColumns,
    collegeId: uuid('college_id').notNull().references(() => colleges.id, { onDelete: 'cascade' }),
    resourceId: uuid('resource_id').notNull().references(() => academicResources.id, { onDelete: 'cascade' }),
    reporterUserId: uuid('reporter_user_id').notNull(),
    reason: varchar('reason', { length: 64 }).notNull(), // SPAM, COPYRIGHT, BROKEN, WRONG_CATEGORY
    details: text('details'),
    status: varchar('status', { length: 32 }).default('PENDING').notNull(), // PENDING, RESOLVED, DISMISSED
    ...auditColumns
  },
  (table) => ({
    resourceStatusIdx: index('resource_reports_resource_status_idx').on(table.resourceId, table.status)
  })
);

/**
 * 19. Resource Statistics (Pre-Aggregated Read Cache)
 */
export const resourceStatistics = pgTable(
  'resource_statistics',
  {
    resourceId: uuid('resource_id').primaryKey().references(() => academicResources.id, { onDelete: 'cascade' }),
    collegeId: uuid('college_id').notNull().references(() => colleges.id, { onDelete: 'cascade' }),
    totalDownloads: integer('total_downloads').default(0).notNull(),
    totalViews: integer('total_views').default(0).notNull(),
    helpfulVotes: integer('helpful_votes').default(0).notNull(),
    unhelpfulVotes: integer('unhelpful_votes').default(0).notNull(),
    reportCount: integer('report_count').default(0).notNull(),
    bookmarkCount: integer('bookmark_count').default(0).notNull(),
    bayesianQualityScore: numeric('bayesian_quality_score', { precision: 4, scale: 2 }).default('0.00').notNull(),
    lastCalculatedAt: timestamp('last_calculated_at', { mode: 'date', precision: 3 }).defaultNow().notNull()
  },
  (table) => ({
    collegeQualityScoreIdx: index('resource_statistics_college_score_idx').on(table.collegeId, table.bayesianQualityScore)
  })
);

/**
 * 20. Contributors (Uploader Reputation & Badges)
 */
export const contributors = pgTable(
  'contributors',
  {
    ...baseColumns,
    collegeId: uuid('college_id').notNull().references(() => colleges.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    reputationScore: integer('reputation_score').default(0).notNull(),
    totalUploads: integer('total_uploads').default(0).notNull(),
    totalHelpfulVotesReceived: integer('total_helpful_votes_received').default(0).notNull(),
    badgeLevel: varchar('badge_level', { length: 64 }).default('CONTRIBUTOR').notNull(), // CONTRIBUTOR, PEER_TUTOR, VERIFIED_SCHOLAR
    ...auditColumns
  },
  (table) => ({
    userCollegeIdx: uniqueIndex('contributors_user_college_idx').on(table.userId, table.collegeId)
  })
);
