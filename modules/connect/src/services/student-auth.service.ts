/**
 * Campus Connect — Student Auth Service
 * Register / login / session tokens for students. Stores the student's gender
 * (MALE | FEMALE) which is required for opposite-gender random chat matching.
 * Passwords are hashed with scrypt; session tokens are HMAC-SHA256 signed and
 * expire after 30 days. All storage is in-memory (mirrors the module's repos).
 */

import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto';

export type Gender = 'MALE' | 'FEMALE';

export interface StudentAccount {
  id: string;
  collegeId: string;
  email: string;
  fullName: string;
  gender: Gender;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

export interface StudentSession {
  token: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    gender: Gender;
    collegeId: string;
  };
}

const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const SECRET = process.env.JWT_SECRET || process.env.ANONYMOUS_TOKEN_SALT || 'campizo-student-auth-dev-secret-2026';

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('base64url');
}

function publicUser(account: StudentAccount) {
  return {
    id: account.id,
    email: account.email,
    fullName: account.fullName,
    gender: account.gender,
    collegeId: account.collegeId
  };
}

export class StudentAuthService {
  private accountsByEmail = new Map<string, StudentAccount>();
  private accountsById = new Map<string, StudentAccount>();

  /** Wipe all accounts (used by tests for isolation). */
  reset(): void {
    this.accountsByEmail.clear();
    this.accountsById.clear();
  }

  register(input: {
    email: string;
    password: string;
    fullName: string;
    gender: Gender;
    collegeId: string;
  }): StudentSession {
    const email = input.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('INVALID_EMAIL');
    if (input.password.length < 8) throw new Error('WEAK_PASSWORD');
    if (input.gender !== 'MALE' && input.gender !== 'FEMALE') throw new Error('INVALID_GENDER');
    if (this.accountsByEmail.has(email)) throw new Error('ACCOUNT_EXISTS');

    const salt = randomBytes(16);
    const passwordHash = scryptSync(input.password, salt, 64).toString('hex');
    const account: StudentAccount = {
      id: `usr_${randomBytes(8).toString('hex')}`,
      collegeId: input.collegeId,
      email,
      fullName: input.fullName.trim(),
      gender: input.gender,
      passwordHash,
      salt: salt.toString('hex'),
      createdAt: new Date().toISOString()
    };

    this.accountsByEmail.set(email, account);
    this.accountsById.set(account.id, account);
    return { token: this.issueToken(account), user: publicUser(account) };
  }

  login(input: { email: string; password: string }): StudentSession {
    const email = input.email.trim().toLowerCase();
    const account = this.accountsByEmail.get(email);
    if (!account) throw new Error('INVALID_CREDENTIALS');

    const hash = scryptSync(input.password, Buffer.from(account.salt, 'hex'), 64);
    const expected = Buffer.from(account.passwordHash, 'hex');
    if (hash.length !== expected.length || !timingSafeEqual(hash, expected)) {
      throw new Error('INVALID_CREDENTIALS');
    }

    return { token: this.issueToken(account), user: publicUser(account) };
  }

  issueToken(account: StudentAccount): string {
    const issuedAt = Math.floor(Date.now() / 1000);
    const payload = `${account.id}|${account.collegeId}|${issuedAt}`;
    return `v1.${Buffer.from(payload).toString('base64url')}.${sign(payload)}`;
  }

  /** Returns { userId, collegeId } when the token is valid and unexpired. */
  verifyToken(token: string): { userId: string; collegeId: string } | null {
    const parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== 'v1') return null;

    let payload: string;
    try {
      payload = Buffer.from(parts[1]!, 'base64url').toString('utf8');
    } catch {
      return null;
    }

    const expectedSig = sign(payload);
    const actualSig = Buffer.from(parts[2]!, 'base64url');
    const expectedBuf = Buffer.from(expectedSig, 'base64url');
    if (actualSig.length !== expectedBuf.length || !timingSafeEqual(actualSig, expectedBuf)) return null;

    const [userId, collegeId, issuedAtStr] = payload.split('|');
    const issuedAt = parseInt(issuedAtStr ?? '', 10);
    if (!userId || !collegeId || Number.isNaN(issuedAt)) return null;
    if (Date.now() / 1000 - issuedAt > TOKEN_TTL_SECONDS) return null;

    return { userId, collegeId };
  }

  getAccountById(userId: string): StudentAccount | null {
    return this.accountsById.get(userId) || null;
  }
}

/** Default singleton used by middleware, controllers and routes. */
export const studentAuthService = new StudentAuthService();
