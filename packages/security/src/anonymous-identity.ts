import { createHmac } from 'node:crypto';

function requireSalt(): string {
  const salt = process.env.ANONYMOUS_TOKEN_SALT;
  if (!salt || salt.length < 32) {
    throw new Error('ANONYMOUS_TOKEN_SALT must be set to a 32+ character value');
  }
  return salt;
}

export function generateAnonymousToken(userId: string, collegeId: string, secretSalt = requireSalt()): string {
  const payload = `${userId}:${collegeId}`;
  return createHmac('sha256', secretSalt).update(payload).digest('hex');
}
