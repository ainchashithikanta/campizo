import { z } from 'zod';

export const ResourceSearchQuerySchema = z.object({
  query: z.string().optional(),
  subjectId: z.string().optional(),
  departmentId: z.string().optional(),
  semesterNumber: z.coerce.number().optional(),
  categoryCode: z.string().optional(),
  schemeCode: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20)
});

export const ResourceCreateSchema = z.object({
  departmentId: z.string().min(1),
  subjectId: z.string().min(1),
  courseId: z.string().optional(),
  schemeId: z.string().optional(),
  examTypeId: z.string().optional(),
  resourceTypeId: z.string().min(1),
  title: z.string().min(3).max(256),
  slug: z.string().min(3).max(300),
  description: z.string().optional(),
  academicYear: z.string().min(4).max(16),
  semesterNumber: z.number().int().min(1).max(10),
  isAnonymous: z.boolean().optional().default(false),
  authorDisplayName: z.string().optional(),
  fileSizeBytes: z.number().int().min(50 * 1024).max(50 * 1024 * 1024),
  mimeType: z.string().min(3),
  sha256Hash: z.string().length(64),
  fileName: z.string().min(1).max(256),
  storageKey: z.string().min(1).max(512)
});

export const ResourceVersionCreateSchema = z.object({
  changelogNotes: z.string().optional(),
  fileSizeBytes: z.number().int().min(50 * 1024).max(50 * 1024 * 1024),
  mimeType: z.string().min(3),
  sha256Hash: z.string().length(64),
  fileName: z.string().min(1).max(256),
  storageKey: z.string().min(1).max(512)
});

export const CollectionCreateSchema = z.object({
  title: z.string().min(3).max(256),
  description: z.string().optional(),
  isPublic: z.boolean().optional().default(true)
});

export const CollectionUpdateSchema = z.object({
  title: z.string().min(3).max(256),
  description: z.string().optional(),
  isPublic: z.boolean().optional()
});

export const CollectionItemAddSchema = z.object({
  resourceId: z.string().min(1)
});

export const CollectionReorderSchema = z.object({
  items: z.array(
    z.object({
      resourceId: z.string().min(1),
      positionOrder: z.number().int().min(1)
    })
  )
});

export const VoteSchema = z.object({
  isHelpful: z.boolean()
});

export const ReportSchema = z.object({
  reason: z.string().min(3).max(64),
  details: z.string().optional()
});

export const UploadSessionCreateSchema = z.object({
  fileName: z.string().min(1).max(256),
  fileSizeBytes: z.number().int().min(50 * 1024).max(50 * 1024 * 1024),
  mimeType: z.string().min(3),
  sha256Hash: z.string().length(64)
});
