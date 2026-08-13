import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { signJwt } from '@college-hub/security';
import {
  InMemoryConfessionRepository,
  InMemoryCommentRepository,
  InMemoryModerationRepository,
  InMemoryNotificationRepository,
  InMemoryAnonymousIdentityRepository,
  InMemoryBookmarkRepository,
  InMemoryVoteRepository,
  ConfessionUseCases,
  ConfessionQueries,
  confessionRoutes,
  InMemoryIdempotencyStore
} from '../src/index.js';

describe('Campus Confessions Fastify REST API Integration Suite', () => {
  let app: FastifyInstance;
  let idempotencyStore: InMemoryIdempotencyStore;
  let publishedEvents: Array<{ eventType: string; payload: any }> = [];

  const COLLEGE = 'college-stanford-001';
  const HEADERS = {
    'x-college-id': COLLEGE,
    'x-request-id': 'req-test-001',
    'x-user-id': 'user-student-101'
  };

  beforeAll(() => {
    // Secrets required by the JWT middleware (fail-closed when missing).
    process.env.JWT_SECRET = 'test-jwt-secret-0123456789abcdef0123456789abcdef';
    process.env.ANONYMOUS_TOKEN_SALT = 'test-anonymous-token-salt-0123456789';
  });

  beforeEach(async () => {
    const confessionRepo = new InMemoryConfessionRepository();
    const commentRepo = new InMemoryCommentRepository();
    const modRepo = new InMemoryModerationRepository();
    const notifRepo = new InMemoryNotificationRepository();
    const identityRepo = new InMemoryAnonymousIdentityRepository();
    const bookmarkRepo = new InMemoryBookmarkRepository();
    const voteRepo = new InMemoryVoteRepository();

    publishedEvents = [];
    const eventPublisher = {
      async publish(eventType: string, payload: any) {
        publishedEvents.push({ eventType, payload });
      }
    };

    const useCases = new ConfessionUseCases(
      confessionRepo,
      commentRepo,
      voteRepo,
      bookmarkRepo,
      modRepo,
      identityRepo,
      notifRepo,
      eventPublisher
    );

    const queries = new ConfessionQueries(confessionRepo, commentRepo, bookmarkRepo, voteRepo, modRepo);

    idempotencyStore = new InMemoryIdempotencyStore(5000); // 5s TTL for tests

    app = Fastify({ logger: false });
    await app.register(confessionRoutes, { useCases, queries, idempotencyStore });
    await app.ready();
  });

  afterEach(async () => {
    idempotencyStore.clear();
    await app.close();
  });

  // ── Tenant & Auth Middleware Tests ───────────────────────────────────

  it('should reject requests missing x-college-id with HTTP 403 MISSING_TENANT_HEADER', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/confessions/feed' });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error.code).toBe('MISSING_TENANT_HEADER');
  });

  it('should reject malformed JWT token with HTTP 401 INVALID_JWT', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/confessions/feed',
      headers: { ...HEADERS, authorization: 'Bearer invalid-malformed-token' }
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).error.code).toBe('INVALID_JWT');
  });

  it('should reject non-moderator trying to access moderation queue with HTTP 403 MODERATION_ACCESS_DENIED', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/confessions/moderation/queue',
      headers: { ...HEADERS, 'x-user-role': 'STUDENT' }
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error.code).toBe('MODERATION_ACCESS_DENIED');
  });

  it('should allow MODERATOR role to access moderation queue via verified JWT', async () => {
    const moderatorToken = signJwt({
      sub: 'user-mod-001',
      collegeId: COLLEGE,
      roles: ['MODERATOR']
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/confessions/moderation/queue',
      headers: { ...HEADERS, authorization: `Bearer ${moderatorToken}` }
    });
    expect(res.statusCode).toBe(200);
  });

  // ── Feed ────────────────────────────────────────────────────────────

  it('should fetch campus feed with valid RequestContext', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/confessions/feed', headers: HEADERS });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.metadata.collegeId).toBe(COLLEGE);
    expect(body.metadata.requestId).toBe('req-test-001');
  });

  // ── Create Confession & Transaction Safety ─────────────────────────

  it('should create a confession and emit domain event ONLY AFTER successful commit', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/confessions',
      headers: { ...HEADERS, 'x-idempotency-key': 'idem-create-1' },
      payload: {
        categoryCode: 'academic',
        title: 'CASIO FX-991ES+ Memory Clear',
        content: 'Remember to press Shift + 9 + 3 before entering lab!'
      }
    });
    expect(res.statusCode).toBe(201);
    expect(publishedEvents.length).toBe(1);
    expect(publishedEvents[0]?.eventType).toBe('ConfessionPublished');
  });

  it('should NOT emit event if transaction fails or payload is invalid', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/confessions',
      headers: HEADERS,
      payload: { categoryCode: 'academic', title: 'Hi', content: 'Short' }
    });
    expect(res.statusCode).toBe(400);
    expect(publishedEvents.length).toBe(0); // No event published on failure
  });

  // ── Idempotency ─────────────────────────────────────────────────────

  it('should return cached response for duplicate idempotency key', async () => {
    const idemKey = 'idem-duplicate-test-1';
    const payload = {
      categoryCode: 'rant',
      title: 'Duplicate Test Confession',
      content: 'This should only be created once.'
    };

    const res1 = await app.inject({
      method: 'POST',
      url: '/api/v1/confessions',
      headers: { ...HEADERS, 'x-idempotency-key': idemKey },
      payload
    });
    expect(res1.statusCode).toBe(201);

    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/confessions',
      headers: { ...HEADERS, 'x-idempotency-key': idemKey },
      payload
    });
    expect(res2.statusCode).toBe(200); // Cached
  });

  // ── Concurrent Reports & Event Ordering ──────────────────────────────

  it('should process concurrent reports and preserve event ordering', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/confessions',
      headers: HEADERS,
      payload: {
        categoryCode: 'rant',
        title: 'Concurrent Report Test',
        content: 'Test confession for concurrent reporting.'
      }
    });
    const confessionId = JSON.parse(createRes.body).data.id;

    // Simulate 3 concurrent reports
    const reportPromises = [1, 2, 3].map((i) =>
      app.inject({
        method: 'POST',
        url: `/api/v1/confessions/${confessionId}/report`,
        headers: { ...HEADERS, 'x-user-id': `user-reporter-${i}` },
        payload: { reasonCode: 'SPAM' }
      })
    );

    const results = await Promise.all(reportPromises);
    expect(results.every((r) => r.statusCode === 200)).toBe(true);

    // Event ordering check: ConfessionPublished must precede ReportSubmitted events
    const eventTypes = publishedEvents.map((e) => e.eventType);
    expect(eventTypes[0]).toBe('ConfessionPublished');
    expect(eventTypes.filter((t) => t === 'ReportSubmitted').length).toBe(3);
  });
});
