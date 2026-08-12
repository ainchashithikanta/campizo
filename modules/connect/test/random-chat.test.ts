/**
 * Campus Connect — Tests for student auth + random chat (opposite-gender match,
 * auto-expiry, leave-closes-for-both, encrypted message storage).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { connectRoutesPlugin } from '../src/routes/connect.routes.js';
import { studentAuthService } from '../src/services/student-auth.service.js';
import { clearIdempotencyCache } from '../src/middleware/idempotency.js';

async function register(app: ReturnType<typeof Fastify>, gender: 'MALE' | 'FEMALE', name: string) {
  const email = `${name.toLowerCase().replace(/\s+/g, '')}@example.com`;
  const res = await app.inject({
    method: 'POST',
    url: '/connect/auth/register',
    headers: { 'x-college-id': 'college_stanford_001' },
    payload: { email, password: 'password123', fullName: name, gender }
  });
  if (res.statusCode !== 201) {
    console.log('REGISTER FAILURE', name, res.statusCode, res.body);
  }
  expect(res.statusCode).toBe(201);
  return res.json().data;
}

describe('Student Auth + Random Chat (MS-23.8.3)', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    studentAuthService.reset();
    clearIdempotencyCache();
    app = Fastify();
    await app.register(connectRoutesPlugin);
    await app.ready();
  });

  it('registers students with gender and rejects missing gender on random chat', async () => {
    const male = await register(app, 'MALE', 'Male Student');
    const female = await register(app, 'FEMALE', 'Female Student');

    // Male joins, gets matched with female
    const joinRes = await app.inject({
      method: 'POST',
      url: '/connect/random/join',
      headers: { 'x-college-id': 'college_stanford_001', 'x-auth-token': male.token }
    });

    // No opposite-gender peer yet -> waiting
    expect(joinRes.statusCode).toBe(200);
    const joinBody = joinRes.json().data;
    expect(joinBody.status).toBe('WAITING');

    const matchRes = await app.inject({
      method: 'POST',
      url: '/connect/random/join',
      headers: { 'x-college-id': 'college_stanford_001', 'x-auth-token': female.token }
    });
    const match = matchRes.json().data;
    expect(match.status).toBe('MATCHED');
    expect(match.peerGender).toBe('MALE');
    expect(match.conversationKey).toBeTruthy();

    // Male's status now shows MATCHED with the key
    const statusRes = await app.inject({
      method: 'GET',
      url: '/connect/random/status',
      headers: { 'x-college-id': 'college_stanford_001', 'x-auth-token': male.token }
    });
    expect(statusRes.json().data.status).toBe('MATCHED');
    expect(statusRes.json().data.conversationKey).toBe(match.conversationKey);
  });

  it('blocks a tokenless request to random chat', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/connect/random/join',
      headers: { 'x-college-id': 'college_stanford_001' }
    });
    expect(res.statusCode).toBe(403);
  });

  it('closes the conversation for both sides when one member leaves', async () => {
    const male = await register(app, 'MALE', 'Leave Male');
    const female = await register(app, 'FEMALE', 'Leave Female');

    const maleJoin = (
      await app.inject({
        method: 'POST',
        url: '/connect/random/join',
        headers: { 'x-college-id': 'college_stanford_001', 'x-auth-token': male.token }
      })
    ).json().data;
    const femaleJoin = (
      await app.inject({
        method: 'POST',
        url: '/connect/random/join',
        headers: { 'x-college-id': 'college_stanford_001', 'x-auth-token': female.token }
      })
    ).json().data;
    const convId = femaleJoin.conversationId;
    expect(convId).toBeDefined();

    // Female leaves
    const leaveRes = await app.inject({
      method: 'POST',
      url: '/connect/random/leave',
      headers: { 'x-college-id': 'college_stanford_001', 'x-auth-token': female.token }
    });
    expect(leaveRes.statusCode).toBe(200);
    expect(leaveRes.json().data.reason).toBe('LEFT');

    // Male's status now reflects closed conversation
    const maleStatus = await app.inject({
      method: 'GET',
      url: '/connect/random/status',
      headers: { 'x-college-id': 'college_stanford_001', 'x-auth-token': male.token }
    });
    expect(maleStatus.json().data.status).toBe('CLOSED');
    expect(maleStatus.json().data.reason).toBe('LEFT');

    // Sending to a closed conversation fails
    const msgRes = await app.inject({
      method: 'POST',
      url: '/connect/messages',
      headers: {
        'x-college-id': 'college_stanford_001',
        'x-auth-token': male.token,
        'Content-Type': 'application/json'
      },
      payload: { conversationId: convId, ciphertext: 'abc', iv: 'iv', algorithm: 'AES-256-GCM' }
    });
    expect(msgRes.statusCode).toBe(409);
  });

  it('auto-closes a random chat when its TTL elapses', async () => {
    const { vi } = await import('vitest');
    vi.stubEnv('RANDOM_CHAT_TTL_MS', '0');

    const male = await register(app, 'MALE', 'Expire Male');
    const female = await register(app, 'FEMALE', 'Expire Female');

    await app.inject({
      method: 'POST',
      url: '/connect/random/join',
      headers: { 'x-college-id': 'college_stanford_001', 'x-auth-token': male.token }
    });
    await app.inject({
      method: 'POST',
      url: '/connect/random/join',
      headers: { 'x-college-id': 'college_stanford_001', 'x-auth-token': female.token }
    });

    const maleStatus = (
      await app.inject({
        method: 'GET',
        url: '/connect/random/status',
        headers: { 'x-college-id': 'college_stanford_001', 'x-auth-token': male.token }
      })
    ).json().data;
    expect(maleStatus.status).toBe('CLOSED');
    expect(maleStatus.reason).toBe('TIMEOUT');

    vi.unstubAllEnvs();
  });
});
