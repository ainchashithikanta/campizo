import type { UserRole, SubscriptionTier } from '../enums/index.js';
import type { UserId, CollegeId, TenantId, EventId } from '../utilities/index.js';

export interface CollegeTheme {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  faviconUrl: string;
  darkModeDefault: boolean;
}

export type CollegeThemeConfig = CollegeTheme;

export interface ModerationPolicy {
  confessionsAutoApprove: boolean;
  professorsReviewModeration: 'PRE_MODERATION' | 'POST_MODERATION';
  assignedModeratorUserIds: string[];
}

export interface CollegeTenant {
  id: CollegeId;
  name: string;
  slug: string;
  allowedEmailDomains: string[];
  theme: CollegeTheme;
  enabledModules: string[];
  moderationPolicy: ModerationPolicy;
  tier: SubscriptionTier;
  customDomain?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: UserId;
  collegeId: CollegeId;
  email: string;
  fullName: string;
  role: UserRole;
  isEmailVerified: boolean;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLogRecord {
  id: string;
  collegeId: CollegeId;
  actorUserId: UserId;
  actorRole: UserRole;
  action: string;
  targetEntityId: string;
  targetEntityType: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

export interface DomainEvent<T = Record<string, unknown>> {
  eventId: EventId;
  eventType: string;
  timestamp: Date;
  collegeId: TenantId;
  actorUserId?: UserId;
  payload: T;
}
