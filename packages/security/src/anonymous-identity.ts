import { createHmac } from 'node:crypto';

export function generateAnonymousToken(
  userId: string,
  collegeId: string,
  secretSalt = process.env.ANONYMOUS_TOKEN_SALT || 'college-hub-anonymous-salt-secret'
): string {
  const payload = `${userId}:${collegeId}`;
  return createHmac('sha256', secretSalt).update(payload).digest('hex');
}
