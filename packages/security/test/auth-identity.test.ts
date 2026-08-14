import { describe, it, expect, beforeEach } from 'vitest';
import {
  IdentityKernelService,
  validatePasswordStrength,
  hashPassword,
  verifyPassword,
  needsRehash,
  generateAnonymousToken,
  RECOMMENDED_ARGON2_OPTIONS
} from '../src/index.js';

// Test-only anonymous-token salt — the identity kernel fails closed in
// production without an explicitly configured salt (no fallbacks).
process.env.ANONYMOUS_TOKEN_SALT = 'auth-identity-tests-only-salt-32chars!';

describe('Core Multi-Tenant Authentication & Identity Kernel (Argon2id & Enhanced Sessions)', () => {
  let authService: IdentityKernelService;

  beforeEach(() => {
    authService = new IdentityKernelService();
  });

  it('should hash and verify passwords using production-grade Argon2id', async () => {
    const pwd = 'ValidArgon2P@ssw0rd!';
    const hash = await hashPassword(pwd);

    expect(hash.startsWith('$argon2id')).toBe(true);
    expect(await verifyPassword(pwd, hash)).toBe(true);
    expect(await verifyPassword('WrongPassword123!', hash)).toBe(false);
  });

  it('should detect when Argon2id parameters require rehashing', async () => {
    const pwd = 'Argon2RehashPassword1!';
    const hash = await hashPassword(pwd, RECOMMENDED_ARGON2_OPTIONS);

    // Current hash matches recommended options
    expect(needsRehash(hash, RECOMMENDED_ARGON2_OPTIONS)).toBe(false);

    // Outdated options (e.g. higher memory cost needed in future)
    const upgradedOptions = { ...RECOMMENDED_ARGON2_OPTIONS, memoryCost: 131072 };
    expect(needsRehash(hash, upgradedOptions)).toBe(true);
  });

  it('should enforce 5-password history rule preventing reuse of recent passwords', async () => {
    const otpRes = await authService.requestEduOtp('student@stanford.edu', 'college-stanford-001');
    const regRes = await authService.verifyOtpAndRegister({
      email: 'student@stanford.edu',
      otpCode: otpRes.otpCode!,
      username: 'stanford_tree',
      displayName: 'Stanford Student',
      password: 'InitialP@ssword123',
      collegeId: 'college-stanford-001'
    });

    const user = regRes.user!;

    // Attempting to change password to the same initial password fails!
    const reusedChange = await authService.changePassword(user.id, 'InitialP@ssword123', 'InitialP@ssword123');
    expect(reusedChange.success).toBe(false);
    expect(reusedChange.error).toContain('PASSWORD_REUSED');

    // Change to a new valid password succeeds
    const validChange = await authService.changePassword(user.id, 'InitialP@ssword123', 'SecondP@ssword123');
    expect(validChange.success).toBe(true);

    // Changing back to initial password fails (in last 5 history)
    const revertChange = await authService.changePassword(user.id, 'SecondP@ssword123', 'InitialP@ssword123');
    expect(revertChange.success).toBe(false);
  });

  it('should support configurable 30-day refresh token lifetime and device session metadata', async () => {
    authService.setRefreshTokenLifetimeMs(30 * 24 * 60 * 60 * 1000); // 30 Days

    const otpRes = await authService.requestEduOtp('user@mit.edu', 'college-mit-002');
    await authService.verifyOtpAndRegister({
      email: 'user@mit.edu',
      otpCode: otpRes.otpCode!,
      username: 'mit_beaver',
      displayName: 'MIT Student',
      password: 'StrongP@ssword123',
      collegeId: 'college-mit-002'
    });

    const loginRes = await authService.login({
      identifier: 'mit_beaver',
      password: 'StrongP@ssword123',
      collegeId: 'college-mit-002',
      deviceId: 'macbook-pro-1',
      deviceInfo: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      ipAddress: '18.9.22.1',
      deviceMetadata: {
        deviceName: 'MacBook Pro 16"',
        platform: 'Desktop',
        browser: 'Chrome 125',
        os: 'macOS Sonoma',
        approximateLocation: 'Cambridge, MA, USA'
      }
    });

    expect(loginRes.success).toBe(true);

    const userSessions = authService.getUserSessions(loginRes.user!.id);
    expect(userSessions.length).toBe(1);

    const session = userSessions[0]!;
    expect(session.deviceName).toBe('MacBook Pro 16"');
    expect(session.platform).toBe('Desktop');
    expect(session.browser).toBe('Chrome 125');
    expect(session.os).toBe('macOS Sonoma');
    expect(session.approximateLocation).toBe('Cambridge, MA, USA');
    expect(session.firstLoginAt).toBeDefined();
    expect(session.lastActiveAt).toBeDefined();
  });

  it('should generate non-reversible blind HMAC anonymous tokens', () => {
    const salt = 'test-anonymous-token-salt-32chars!';
    const anonToken1 = generateAnonymousToken('usr-uuid-1', 'college-stanford-001', salt);
    const anonToken2 = generateAnonymousToken('usr-uuid-1', 'college-stanford-001', salt);
    const anonToken3 = generateAnonymousToken('usr-uuid-2', 'college-stanford-001', salt);

    expect(anonToken1).toBe(anonToken2);
    expect(anonToken1).not.toBe(anonToken3);
    expect(anonToken1).not.toContain('usr-uuid-1');
  });
});
