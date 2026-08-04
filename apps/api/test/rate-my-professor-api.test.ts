import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/server.js';

describe('Rate My Professor — Production Fastify REST API Integration (MS-18.8.3)', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/v1/professors — should search and list professors in standard API envelope', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/professors?query=Turing',
      headers: {
        'x-college-id': 'college-stanford-001'
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);

    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].fullName).toBe('Dr. Alan Turing');
    expect(body.meta.requestId).toBeDefined();
  });

  it('GET /api/v1/professors/:slug — should return professor profile by slug', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/professors/dr-alan-turing',
      headers: {
        'x-college-id': 'college-stanford-001'
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);

    expect(body.success).toBe(true);
    expect(body.data.slug).toBe('dr-alan-turing');
    expect(body.data.fullName).toBe('Dr. Alan Turing');
  });

  it('GET /api/v1/professors/:slug — should return 404 EntityNotFoundError for non-existent slug', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/professors/non-existent-prof-slug-xyz',
      headers: {
        'x-college-id': 'college-stanford-001'
      }
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.payload);

    expect(body.success).toBe(false);
    expect(body.error.code).toBe('ENTITY_NOT_FOUND');
  });

  it('GET /api/v1/professors/:slug/statistics — should return professor statistics', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/professors/dr-alan-turing/statistics',
      headers: {
        'x-college-id': 'college-stanford-001'
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);

    expect(body.success).toBe(true);
    expect(body.data.bayesianRating).toBeDefined();
    expect(body.data.totalReviewsCount).toBeDefined();
  });

  it('GET /api/v1/professors/:slug/reviews — should list reviews for a professor', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/professors/dr-alan-turing/reviews',
      headers: {
        'x-college-id': 'college-stanford-001'
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);

    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('POST /api/v1/professors/:slug/reviews — should submit review and return 201 Created', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/professors/dr-alan-turing/reviews',
      headers: {
        'x-college-id': 'college-stanford-001',
        'x-user-id': 'usr-student-999',
        'x-idempotency-key': 'idempotency-key-uuid-999'
      },
      payload: {
        courseAssignmentId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        reviewText: 'Dr. Turing is a brilliant professor! Deep mathematical foundation.',
        overallRating: 4.9,
        isAnonymous: true
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);

    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    expect(body.data.overallRating).toBe(4.9);
  });

  it('POST /api/v1/professors/:slug/reviews — should return 400 Bad Request for short review text (< 20 chars)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/professors/dr-alan-turing/reviews',
      headers: {
        'x-college-id': 'college-stanford-001'
      },
      payload: {
        courseAssignmentId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        reviewText: 'Too short',
        overallRating: 4.9
      }
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);

    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  it('POST /api/v1/professors/:slug/reviews — should return 409 Conflict for duplicate review in term', async () => {
    // 1st submission
    await app.inject({
      method: 'POST',
      url: '/api/v1/professors/dr-alan-turing/reviews',
      headers: {
        'x-college-id': 'college-stanford-001',
        'x-user-id': 'usr-student-dup'
      },
      payload: {
        courseAssignmentId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        reviewText: 'First review text for this term assignment.',
        overallRating: 4.5
      }
    });

    // 2nd duplicate submission
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/professors/dr-alan-turing/reviews',
      headers: {
        'x-college-id': 'college-stanford-001',
        'x-user-id': 'usr-student-dup'
      },
      payload: {
        courseAssignmentId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        reviewText: 'Second duplicate review text for same term.',
        overallRating: 4.0
      }
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.payload);

    expect(body.success).toBe(false);
    expect(body.error.code).toBe('DUPLICATE_REVIEW_FOR_TERM');
  });

  it('POST /api/v1/professors/:slug/reviews/:reviewId/votes — should vote helpful on a review', async () => {
    // 1. Submit review
    const postRes = await app.inject({
      method: 'POST',
      url: '/api/v1/professors/dr-alan-turing/reviews',
      headers: {
        'x-college-id': 'college-stanford-001',
        'x-user-id': 'usr-student-author'
      },
      payload: {
        courseAssignmentId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        reviewText: 'Review text for voting test purposes.',
        overallRating: 4.7
      }
    });
    const reviewId = JSON.parse(postRes.payload).data.id;

    // 2. Vote helpful
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/professors/dr-alan-turing/reviews/${reviewId}/votes`,
      headers: {
        'x-college-id': 'college-stanford-001',
        'x-user-id': 'usr-voter-2'
      },
      payload: {
        voteType: 'HELPFUL'
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('VOTE_RECORDED');
  });

  it('POST /api/v1/professors/:slug/reviews/:reviewId/reports — should report a review', async () => {
    // 1. Submit review
    const postRes = await app.inject({
      method: 'POST',
      url: '/api/v1/professors/dr-alan-turing/reviews',
      headers: {
        'x-college-id': 'college-stanford-001',
        'x-user-id': 'usr-student-author-2'
      },
      payload: {
        courseAssignmentId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        reviewText: 'Review text for reporting test purposes.',
        overallRating: 4.0
      }
    });
    const reviewId = JSON.parse(postRes.payload).data.id;

    // 2. Report review
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/professors/dr-alan-turing/reviews/${reviewId}/reports`,
      headers: {
        'x-college-id': 'college-stanford-001',
        'x-user-id': 'usr-reporter-1'
      },
      payload: {
        reason: 'SPAM',
        details: 'Review contains spam content.'
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('REPORT_RECORDED');
  });

  it('DELETE /api/v1/professors/:slug/reviews/:reviewId — should soft-delete a review within edit window', async () => {
    const postRes = await app.inject({
      method: 'POST',
      url: '/api/v1/professors/dr-alan-turing/reviews',
      headers: {
        'x-college-id': 'college-stanford-001',
        'x-user-id': 'usr-student-del'
      },
      payload: {
        courseAssignmentId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        reviewText: 'Review text to be deleted within edit window.',
        overallRating: 3.5
      }
    });
    const reviewId = JSON.parse(postRes.payload).data.id;

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/professors/dr-alan-turing/reviews/${reviewId}`,
      headers: {
        'x-college-id': 'college-stanford-001',
        'x-user-id': 'usr-student-del'
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('REVIEW_DELETED');
  });

  it('DELETE /api/v1/professors/:slug/reviews/:reviewId/votes — should remove a vote from a review', async () => {
    const postRes = await app.inject({
      method: 'POST',
      url: '/api/v1/professors/dr-alan-turing/reviews',
      headers: {
        'x-college-id': 'college-stanford-001',
        'x-user-id': 'usr-student-vote-author'
      },
      payload: {
        courseAssignmentId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        reviewText: 'Review text for vote removal test.',
        overallRating: 4.2
      }
    });
    const reviewId = JSON.parse(postRes.payload).data.id;

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/professors/dr-alan-turing/reviews/${reviewId}/votes`,
      headers: {
        'x-college-id': 'college-stanford-001',
        'x-user-id': 'usr-voter-del'
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('VOTE_REMOVED');
  });

  it('PUT /api/v1/professors/:slug/faculty-response/:responseId — should update faculty response', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/professors/dr-alan-turing/faculty-response/resp-uuid-101',
      headers: {
        'x-college-id': 'college-stanford-001',
        'x-user-id': 'prof-user-101'
      },
      payload: {
        responseText: 'Updated faculty response text for the student review.'
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.responseId).toBe('resp-uuid-101');
  });

  it('POST /api/v1/professors/:slug/reviews — should enforce idempotency key header', async () => {
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/v1/professors/dr-alan-turing/reviews',
      headers: {
        'x-college-id': 'college-stanford-001',
        'x-user-id': 'usr-idempotent-student',
        'x-idempotency-key': 'idem-key-test-uuid-001'
      },
      payload: {
        courseAssignmentId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        reviewText: 'Testing idempotency header handling on review submission.',
        overallRating: 4.8
      }
    });

    expect(res1.statusCode).toBe(201);
  });
});
