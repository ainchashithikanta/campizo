/**
 * Placement Moderation Suite — Moderator queue & decision endpoints.
 * Verifies FLAGGED items surface in the moderation queue (with blinded author identity)
 * and that moderator decisions (APPROVE / FLAG / DELETE) clear or re-flag them.
 */

import { describe, it, expect, beforeEach, beforeAll, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { signJwt } from '@college-hub/security';
import { InMemoryPlacementRepository } from '../src/infrastructure/repositories/in-memory-placement.repository.js';
import { PlacementUseCases } from '../src/application/use-cases.js';
import { placementRoutesPlugin } from '../src/presentation/routes.js';

describe('Placement Moderation Suite', () => {
  let repo: InMemoryPlacementRepository;
  let useCases: PlacementUseCases;
  let app: FastifyInstance;

  const COLLEGE = 'college-stanford-001';

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-0123456789abcdef0123456789abcdef';
  });

  beforeEach(async () => {
    repo = new InMemoryPlacementRepository();
    useCases = new PlacementUseCases(repo);
    app = Fastify();
    await app.register(placementRoutesPlugin, { useCases });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  const moderatorHeaders = () => ({
    'x-college-id': COLLEGE,
    authorization: `Bearer ${signJwt({ sub: 'usr_mod_001', collegeId: COLLEGE, roles: ['MODERATOR'] })}`
  });

  it('1. Queue: reported 3x experiences/questions become FLAGGED and appear in the moderation queue with blinded author', async () => {
    const exp = await useCases.submitExperience({
      collegeId: COLLEGE,
      authorId: 'usr_student_777',
      companyName: 'Meta',
      roleTitle: 'Software Engineer',
      jobType: 'FULL_TIME',
      branch: 'Computer Science',
      cgpa: 3.9,
      summary: 'Cleared 1 OA and 4 rounds including System Design.'
    });
    for (let i = 0; i < 3; i++) {
      await useCases.reportExperience(exp.id, COLLEGE);
    }
    const flaggedExp = await useCases.getExperienceById(exp.id, COLLEGE);
    expect(flaggedExp?.status).toBe('FLAGGED');

    const q = await useCases.createQuestion({
      collegeId: COLLEGE,
      authorId: 'usr_senior_99',
      companyName: 'Google',
      roleTitle: 'Software Engineer',
      questionText: 'Implement a LRU Cache with O(1) time complexity.',
      topic: 'Data Structures',
      difficulty: 'MEDIUM',
      roundType: 'TECHNICAL'
    });
    for (let i = 0; i < 3; i++) {
      await useCases.reportQuestion(q.id, COLLEGE);
    }
    const flaggedQ = await useCases.getQuestionById(q.id, COLLEGE);
    expect(flaggedQ?.status).toBe('FLAGGED');

    const queue = await useCases.getModerationQueue(COLLEGE);
    expect(queue.experiences.map((e) => e.id)).toContain(exp.id);
    expect(queue.questions.map((question) => question.id)).toContain(q.id);

    const res = await app.inject({
      method: 'GET',
      url: '/placements/moderation/queue',
      headers: moderatorHeaders()
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.experiences[0]!.authorId).toBe('BLIND');
    expect(body.data.questions[0]!.authorId).toBe('BLIND');
  });

  it('2. Decision: APPROVE clears flagged items from the queue and resets question reports', async () => {
    const exp = await useCases.submitExperience({
      collegeId: COLLEGE,
      authorId: 'usr_student_888',
      companyName: 'Meta',
      roleTitle: 'Software Engineer',
      jobType: 'FULL_TIME',
      branch: 'Computer Science',
      cgpa: 3.8,
      summary: 'Cleared 2 technical rounds focused on Graphs and DP.'
    });
    for (let i = 0; i < 3; i++) {
      await useCases.reportExperience(exp.id, COLLEGE);
    }

    const q = await useCases.createQuestion({
      collegeId: COLLEGE,
      authorId: 'usr_senior_98',
      companyName: 'Google',
      roleTitle: 'Software Engineer',
      questionText: 'Find the longest palindromic substring in a given string.',
      topic: 'Strings',
      difficulty: 'MEDIUM',
      roundType: 'TECHNICAL'
    });
    for (let i = 0; i < 3; i++) {
      await useCases.reportQuestion(q.id, COLLEGE);
    }

    const expDecision = await useCases.moderateExperience({
      id: exp.id,
      collegeId: COLLEGE,
      action: 'APPROVE'
    });
    expect(expDecision?.status).toBe('APPROVED');

    const qDecision = await useCases.moderateQuestion({ id: q.id, collegeId: COLLEGE, action: 'APPROVE' });
    expect(qDecision?.status).toBe('ACTIVE');
    expect((await useCases.getQuestionById(q.id, COLLEGE))?.reportsCount).toBe(0);

    const queue = await useCases.getModerationQueue(COLLEGE);
    expect(queue.experiences.map((e) => e.id)).not.toContain(exp.id);
    expect(queue.questions.map((question) => question.id)).not.toContain(q.id);

    const res = await app.inject({
      method: 'POST',
      url: `/placements/moderation/experiences/${exp.id}/decision`,
      headers: moderatorHeaders(),
      payload: { action: 'FLAG' }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.status).toBe('FLAGGED');

    const queueAfterFlag = await useCases.getModerationQueue(COLLEGE);
    expect(queueAfterFlag.experiences.map((e) => e.id)).toContain(exp.id);
  });

  it('3. Gating: invalid token is 401 INVALID_JWT and non-moderators are 403 MODERATION_ACCESS_DENIED', async () => {
    const resInvalid = await app.inject({
      method: 'GET',
      url: '/placements/moderation/queue',
      headers: { 'x-college-id': COLLEGE, authorization: 'Bearer invalid-malformed-token' }
    });
    expect(resInvalid.statusCode).toBe(401);
    expect(JSON.parse(resInvalid.payload).error.code).toBe('INVALID_JWT');

    const resGuest = await app.inject({
      method: 'GET',
      url: '/placements/moderation/queue',
      headers: { 'x-college-id': COLLEGE, 'x-user-id': 'usr_student_101' }
    });
    expect(resGuest.statusCode).toBe(403);
    expect(JSON.parse(resGuest.payload).error.code).toBe('MODERATION_ACCESS_DENIED');

    const resDecision = await app.inject({
      method: 'POST',
      url: '/placements/moderation/experiences/exp_google_swe_001/decision',
      headers: { 'x-college-id': COLLEGE, 'x-user-id': 'usr_student_101' },
      payload: { action: 'APPROVE' }
    });
    expect(resDecision.statusCode).toBe(403);
  });
});
