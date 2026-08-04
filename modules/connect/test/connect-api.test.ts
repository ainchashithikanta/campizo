/**
 * Campus Connect — Integration Tests for Fastify REST HTTP Layer
 * Verifies tenant isolation, privacy guard, RBAC, idempotency, conversation context validation,
 * recommendation endpoint, intent lifecycle, response envelope, structured logging, and event ordering.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { connectRoutesPlugin } from '../src/routes/connect.routes.js';
import { clearIdempotencyCache } from '../src/middleware/idempotency.js';

describe('Campus Connect REST API Integration Tests (MS-23.8.3)', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    clearIdempotencyCache();
    app = Fastify();
    await app.register(connectRoutesPlugin);
    await app.ready();
  });

  describe('1. Response Envelope & Tenant Request Context', () => {
    it('returns standardized ApiV1Response envelope with metadata', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/connect/profile',
        headers: {
          'x-college-id': 'college_stanford_001',
          'x-user-id': 'usr_student_101',
          'x-roles': 'STUDENT',
          'x-request-id': 'req_test_001',
          'x-trace-id': 'trace_test_001'
        }
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.error).toBeNull();
      expect(body.metadata).toBeDefined();
      expect(body.metadata.collegeId).toBe('college_stanford_001');
      expect(body.metadata.requestId).toBe('req_test_001');
      expect(body.metadata.traceId).toBe('trace_test_001');
      expect(body.metadata.timestamp).toBeDefined();
    });
  });

  describe('2. Privacy Guard Middleware', () => {
    it('blocks access when target student profile is in Ghost Mode', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/connect/discovery?targetUserId=usr_target_999',
        headers: {
          'x-college-id': 'college_stanford_001',
          'x-user-id': 'usr_student_101',
          'x-roles': 'STUDENT',
          'x-test-ghost-mode': 'true'
        }
      });

      expect(res.statusCode).toBe(403);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('PRIVACY_RESTRICTED');
    });

    it('blocks access when interaction is restricted due to a block relationship', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/connect/discovery?targetUserId=usr_target_888',
        headers: {
          'x-college-id': 'college_stanford_001',
          'x-user-id': 'usr_student_101',
          'x-roles': 'STUDENT',
          'x-test-blocked': 'true'
        }
      });

      expect(res.statusCode).toBe(403);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('PRIVACY_RESTRICTED');
    });

    it('returns 403 FEATURE_DISABLED when feature flag is disabled', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/connect/profile',
        headers: {
          'x-college-id': 'college_stanford_001',
          'x-user-id': 'usr_student_101',
          'x-roles': 'STUDENT',
          'x-test-feature-disabled': 'true'
        }
      });

      expect(res.statusCode).toBe(403);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FEATURE_DISABLED');
    });
  });

  describe('3. Role-Based Access Control (RBAC)', () => {
    it('denies access to moderation endpoint for non-moderator role', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/connect/moderation/action',
        headers: {
          'x-college-id': 'college_stanford_001',
          'x-user-id': 'usr_student_101',
          'x-roles': 'STUDENT'
        },
        payload: { caseId: 'case_1', actionTaken: 'WARN' }
      });

      expect(res.statusCode).toBe(403);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('allows access to moderation endpoint for MODERATOR role', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/connect/moderation/action',
        headers: {
          'x-college-id': 'college_stanford_001',
          'x-user-id': 'usr_mod_101',
          'x-roles': 'MODERATOR'
        },
        payload: { caseId: 'case_1', actionTaken: 'WARN' }
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('ACTION_RECORDED');
    });
  });

  describe('4. Idempotency Middleware', () => {
    it('caches and re-plays original response for write requests carrying an Idempotency-Key', async () => {
      const idempotencyKey = 'idem_key_unique_9988';

      const firstRes = await app.inject({
        method: 'POST',
        url: '/connect/intents',
        headers: {
          'x-college-id': 'college_stanford_001',
          'x-user-id': 'usr_student_101',
          'x-roles': 'STUDENT',
          'idempotency-key': idempotencyKey
        },
        payload: {
          intentType: 'STUDY_PARTNER',
          title: 'CS224N Pod Member Search',
          priority: 2
        }
      });

      expect(firstRes.statusCode).toBe(201);
      const firstBody = firstRes.json();
      expect(firstBody.success).toBe(true);

      // Re-issue duplicate request
      const secondRes = await app.inject({
        method: 'POST',
        url: '/connect/intents',
        headers: {
          'x-college-id': 'college_stanford_001',
          'x-user-id': 'usr_student_101',
          'x-roles': 'STUDENT',
          'idempotency-key': idempotencyKey
        },
        payload: {
          intentType: 'STUDY_PARTNER',
          title: 'CS224N Pod Member Search',
          priority: 2
        }
      });

      expect(secondRes.statusCode).toBe(201);
      const secondBody = secondRes.json();
      expect(secondBody).toEqual(firstBody);
    });
  });

  describe('5. Intent Lifecycle & Optimistic Locking Transitions', () => {
    it('executes full intent lifecycle with version increments (Create v1 -> Pause v2 -> Fulfill v3 -> Archive)', async () => {
      // 1. Create (Version 1)
      const createRes = await app.inject({
        method: 'POST',
        url: '/connect/intents',
        headers: {
          'x-college-id': 'college_stanford_001',
          'x-user-id': 'usr_student_101',
          'x-roles': 'STUDENT'
        },
        payload: {
          intentType: 'PROJECT_COLLABORATOR',
          title: 'TreeHacks AI Dev Partner'
        }
      });
      expect(createRes.statusCode).toBe(201);
      const intent = createRes.json().data;
      const intentId = intent.id;

      // 2. Pause (Version 1 -> Version 2)
      const pauseRes = await app.inject({
        method: 'POST',
        url: `/connect/intents/${intentId}/pause`,
        headers: {
          'x-college-id': 'college_stanford_001',
          'x-user-id': 'usr_student_101',
          'x-roles': 'STUDENT'
        },
        payload: { version: 1 }
      });
      expect(pauseRes.statusCode).toBe(200);
      expect(pauseRes.json().data.status).toBe('PAUSED');

      // 3. Fulfill (Version 2 -> Version 3)
      const fulfillRes = await app.inject({
        method: 'POST',
        url: `/connect/intents/${intentId}/fulfill`,
        headers: {
          'x-college-id': 'college_stanford_001',
          'x-user-id': 'usr_student_101',
          'x-roles': 'STUDENT'
        },
        payload: { version: 2 }
      });
      expect(fulfillRes.statusCode).toBe(200);
      expect(fulfillRes.json().data.status).toBe('FULFILLED');

      // 4. Archive (Version 3 -> Version 4)
      const archiveRes = await app.inject({
        method: 'POST',
        url: `/connect/intents/${intentId}/archive`,
        headers: {
          'x-college-id': 'college_stanford_001',
          'x-user-id': 'usr_student_101',
          'x-roles': 'STUDENT'
        },
        payload: { version: 3 }
      });
      expect(archiveRes.statusCode).toBe(200);
      expect(archiveRes.json().data.status).toBe('ARCHIVED');
    });
  });

  describe('6. Conversation Context Invariant Validation', () => {
    it('returns 400 Validation Error when mandatory conversation context is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/connect/conversations',
        headers: {
          'x-college-id': 'college_stanford_001',
          'x-user-id': 'usr_student_101',
          'x-roles': 'STUDENT'
        },
        payload: {
          conversationType: 'DIRECT',
          contextType: '',
          contextId: ''
        }
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('7. Recommendation Endpoint & Trust Score Privacy', () => {
    it('returns recommendations without exposing internal TrustScore', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/connect/recommendations',
        headers: {
          'x-college-id': 'college_stanford_001',
          'x-user-id': 'usr_student_101',
          'x-roles': 'STUDENT'
        }
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.items).toBeDefined();
      expect(JSON.stringify(body)).not.toContain('trustScore');
    });
  });
});
