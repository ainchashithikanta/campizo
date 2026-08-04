import { z } from 'zod';

export const FullCollegeConfigSchema = z.object({
  collegeId: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  customDomain: z.string().optional(),
  allowedEmailDomains: z.array(z.string()).min(1),
  enabledModules: z.array(z.string()).default(['rate-my-professor', 'materials-pyqs', 'auth']),

  branding: z
    .object({
      primaryColor: z.string().default('#4F46E5'),
      secondaryColor: z.string().default('#06B6D4'),
      logoUrl: z.string().default('https://collegehub.internal/logo.png'),
      faviconUrl: z.string().default('https://collegehub.internal/favicon.ico'),
      darkModeDefault: z.boolean().default(false)
    })
    .default({
      primaryColor: '#4F46E5',
      secondaryColor: '#06B6D4',
      logoUrl: 'https://collegehub.internal/logo.png',
      faviconUrl: 'https://collegehub.internal/favicon.ico',
      darkModeDefault: false
    }),

  socialLinks: z
    .object({
      twitter: z.string().optional(),
      instagram: z.string().optional(),
      linkedin: z.string().optional(),
      discord: z.string().optional()
    })
    .default({}),

  contactDetails: z
    .object({
      supportEmail: z.string().default('support@collegehub.edu'),
      deanOfficePhone: z.string().optional(),
      address: z.string().optional()
    })
    .default({ supportEmail: 'support@collegehub.edu' }),

  legalPages: z
    .object({
      privacyPolicyUrl: z.string().default('https://collegehub.edu/privacy'),
      termsOfServiceUrl: z.string().default('https://collegehub.edu/terms'),
      communityGuidelinesUrl: z.string().default('https://collegehub.edu/guidelines')
    })
    .default({
      privacyPolicyUrl: 'https://collegehub.edu/privacy',
      termsOfServiceUrl: 'https://collegehub.edu/terms',
      communityGuidelinesUrl: 'https://collegehub.edu/guidelines'
    }),

  maintenanceMode: z
    .object({
      enabled: z.boolean().default(false),
      message: z.string().default('System under scheduled maintenance.'),
      allowedRoles: z.array(z.string()).default(['SUPER_ADMIN', 'COLLEGE_ADMIN'])
    })
    .default({
      enabled: false,
      message: 'System under scheduled maintenance.',
      allowedRoles: ['SUPER_ADMIN', 'COLLEGE_ADMIN']
    }),

  moderation: z
    .object({
      confessionsAutoApprove: z.boolean().default(false),
      professorsReviewModeration: z.enum(['PRE_MODERATION', 'POST_MODERATION']).default('POST_MODERATION'),
      aiAutoFlagThreshold: z.number().min(0).max(1).default(0.85)
    })
    .default({
      confessionsAutoApprove: false,
      professorsReviewModeration: 'POST_MODERATION',
      aiAutoFlagThreshold: 0.85
    }),

  notifications: z
    .object({
      emailNotificationsEnabled: z.boolean().default(true),
      pushNotificationsEnabled: z.boolean().default(true),
      digestFrequency: z.enum(['DAILY', 'WEEKLY', 'REALTIME']).default('REALTIME')
    })
    .default({
      emailNotificationsEnabled: true,
      pushNotificationsEnabled: true,
      digestFrequency: 'REALTIME'
    }),

  moduleSettings: z
    .object({
      marketplace: z
        .object({
          maxActiveListingsPerStudent: z.number().default(10),
          allowedCategories: z.array(z.string()).default(['TEXTBOOKS', 'ELECTRONICS', 'FURNITURE', 'HOUSING', 'OTHER'])
        })
        .default({
          maxActiveListingsPerStudent: 10,
          allowedCategories: ['TEXTBOOKS', 'ELECTRONICS', 'FURNITURE', 'HOUSING', 'OTHER']
        }),

      confessions: z
        .object({
          maxLengthCharacters: z.number().default(500),
          requireStudentVerification: z.boolean().default(true)
        })
        .default({ maxLengthCharacters: 500, requireStudentVerification: true }),

      blindDate: z
        .object({
          matchingAlgorithm: z.string().default('COMPATIBILITY_v1'),
          minMatchScore: z.number().default(70)
        })
        .default({ matchingAlgorithm: 'COMPATIBILITY_v1', minMatchScore: 70 }),

      rateMyProfessor: z
        .object({
          allowAnonymousReviews: z.boolean().default(true),
          minReviewLengthCharacters: z.number().default(20)
        })
        .default({ allowAnonymousReviews: true, minReviewLengthCharacters: 20 }),

      materials: z
        .object({
          maxUploadSizeBytes: z.number().default(52_428_800),
          allowedDocTypes: z.array(z.string()).default(['pdf', 'docx', 'pptx'])
        })
        .default({ maxUploadSizeBytes: 52_428_800, allowedDocTypes: ['pdf', 'docx', 'pptx'] }),

      advertisements: z
        .object({
          enabled: z.boolean().default(false),
          maxBanners: z.number().default(2)
        })
        .default({ enabled: false, maxBanners: 2 }),

      analytics: z
        .object({
          enabled: z.boolean().default(true),
          anonymizeIp: z.boolean().default(true)
        })
        .default({ enabled: true, anonymizeIp: true }),

      storage: z
        .object({
          maxQuotaBytes: z.number().default(107_374_182_400) // 100GB default
        })
        .default({ maxQuotaBytes: 107_374_182_400 }),

      search: z
        .object({
          fuzzySearchEnabled: z.boolean().default(true)
        })
        .default({ fuzzySearchEnabled: true })
    })
    .default({}),

  betaModules: z.array(z.string()).default([]),
  version: z.number().default(1)
});

export type FullCollegeConfig = z.infer<typeof FullCollegeConfigSchema>;

export interface CollegeConfigAuditRecord {
  collegeId: string;
  version: number;
  action: 'ONBOARDED' | 'UPDATED' | 'ROLLBACK';
  oldConfig?: FullCollegeConfig;
  newConfig: FullCollegeConfig;
  updatedBy: string;
  timestamp: Date;
}
