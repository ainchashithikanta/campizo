export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  COLLEGE_ADMIN = 'COLLEGE_ADMIN',
  FACULTY = 'FACULTY',
  STUDENT = 'STUDENT',
  MODERATOR = 'MODERATOR',
  GUEST = 'GUEST'
}

export enum SubscriptionTier {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE'
}

export enum ModerationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  FLAGGED = 'FLAGGED'
}

export enum NotificationCategory {
  ACADEMIC = 'ACADEMIC',
  SOCIAL = 'SOCIAL',
  TRANSACTION = 'TRANSACTION',
  SYSTEM = 'SYSTEM'
}

export enum MarketplaceItemStatus {
  AVAILABLE = 'AVAILABLE',
  PENDING_SALE = 'PENDING_SALE',
  SOLD = 'SOLD',
  REMOVED = 'REMOVED'
}
