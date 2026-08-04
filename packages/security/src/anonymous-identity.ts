import { createHmac } from 'node:crypto';

export function generateAnonymousToken(
  userId: string,
  collegeId: string,
  secretSalt = 'college-hub-anonymous-salt-secret'
): string {
  const payload = `${userId}:${collegeId}`;
  return createHmac('sha256', secretSalt).update(payload).digest('hex');
}
