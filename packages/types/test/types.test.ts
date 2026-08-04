import { describe, it, expect } from 'vitest';
import {
  UserRole,
  SubscriptionTier,
  PLATFORM_CONSTANTS,
  type ApiV1Response,
  type UserId,
  type CollegeId,
  type KnownModuleId
} from '../src/index.js';

describe('Canonical Domain Types & API Contracts', () => {
  it('should export immutable platform constants and enums', () => {
    expect(UserRole.STUDENT).toBe('STUDENT');
    expect(UserRole.SUPER_ADMIN).toBe('SUPER_ADMIN');
    expect(SubscriptionTier.ENTERPRISE).toBe('ENTERPRISE');
    expect(PLATFORM_CONSTANTS.MAX_FILE_SIZE_BYTES).toBe(52_428_800);
  });

  it('should correctly format versioned ApiV1SuccessResponse payloads', () => {
    const successPayload: ApiV1Response<{ message: string }> = {
      success: true,
      data: { message: 'College Hub API operational' },
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 }
    };

    expect(successPayload.success).toBe(true);
    if (successPayload.success) {
      expect(successPayload.data.message).toBe('College Hub API operational');
    }
  });

  it('should correctly format versioned ApiV1ErrorResponse payloads', () => {
    const errorPayload: ApiV1Response<never> = {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid access token provided'
      }
    };

    expect(errorPayload.success).toBe(false);
    if (!errorPayload.success) {
      expect(errorPayload.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('should support branded string types for compile-time ID safety', () => {
    const userId = 'usr-12345' as UserId;
    const collegeId = 'college-stanford-001' as CollegeId;

    expect(typeof userId).toBe('string');
    expect(typeof collegeId).toBe('string');
  });

  it('should maintain type safety across known feature module IDs', () => {
    const validModules: KnownModuleId[] = [
      'rate-my-professor',
      'materials-pyqs',
      'marketplace',
      'confessions',
      'placement-guidance',
      'blind-date',
      'notifications'
    ];
    expect(validModules.length).toBe(7);
  });
});
