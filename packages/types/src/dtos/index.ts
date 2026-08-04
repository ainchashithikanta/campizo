import type { UserRole, SubscriptionTier } from '../enums/index.js';
import type { CollegeTheme, ModerationPolicy } from '../models/index.js';

export interface CreateUserDto {
  email: string;
  password: string;
  fullName: string;
  collegeId: string;
}

export interface UpdateUserDto {
  fullName?: string;
  avatarUrl?: string;
}

export interface UserSessionDto {
  userId: string;
  email: string;
  collegeId: string;
  role: UserRole;
  permissions: string[];
}

export type UserSession = UserSessionDto;

export interface TenantContextDto {
  collegeId: string;
  collegeSlug: string;
  enabledModules: string[];
  tier: SubscriptionTier;
}

export type TenantContext = TenantContextDto;

export interface CreateCollegeTenantDto {
  name: string;
  slug: string;
  allowedEmailDomains: string[];
  theme: CollegeTheme;
  enabledModules: string[];
  moderationPolicy: ModerationPolicy;
  tier?: SubscriptionTier;
  customDomain?: string;
}

export interface NotificationPayloadDto {
  recipientUserId: string;
  collegeId: string;
  category: string;
  title: string;
  body: string;
  deepLink?: string;
  metadata?: Record<string, unknown>;
}
