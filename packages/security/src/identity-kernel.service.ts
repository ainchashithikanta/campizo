import { randomUUID, randomInt } from 'node:crypto';
import { logger } from '@college-hub/logger';
import { observability } from '@college-hub/observability';
import type { UserRole } from '@college-hub/types';
import {
  validatePasswordStrength,
  hashPassword,
  verifyPassword,
  needsRehash,
  isPasswordInHistory,
  RECOMMENDED_ARGON2_OPTIONS
} from './password-policy.js';
import { StructuredAuditLogger } from './audit-logger.js';
import { generateAnonymousToken } from './anonymous-identity.js';

export interface UserRecord {
  id: string;
  collegeId: string;
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
  passwordHistory: string[];
  role: UserRole;
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'LOCKED' | 'SUSPENDED';
  isEmailVerified: boolean;
  failedLoginAttempts: number;
  lockoutUntil: Date | null;
  anonymousTokenSalt: string;
  createdAt: Date;
}

export interface DeviceSessionMetadata {
  deviceName?: string;
  platform?: 'Mobile' | 'Desktop' | 'Web' | string;
  browser?: string;
  os?: string;
  approximateLocation?: string;
}

export interface SessionRecord {
  sessionId: string;
  userId: string;
  collegeId: string;
  refreshToken: string;
  deviceId: string;
  deviceInfo: string;
  deviceName: string;
  platform: string;
  browser: string;
  os: string;
  approximateLocation: string;
  ipAddress: string;
  isRevoked: boolean;
  firstLoginAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
}

export interface OtpRecord {
  email: string;
  collegeId: string;
  otpCode: string;
  expiresAt: Date;
  isUsed: boolean;
}

export class IdentityKernelService {
  private usersStore = new Map<string, UserRecord>();
  private otpsStore = new Map<string, OtpRecord>();
  private sessionsStore = new Map<string, SessionRecord>();
  private auditLogger: StructuredAuditLogger;
  private refreshTokenLifetimeMs: number;
  private passwordHistoryLimit: number;

  constructor(
    auditLogger?: StructuredAuditLogger,
    options: { refreshTokenLifetimeMs?: number; passwordHistoryLimit?: number } = {}
  ) {
    this.auditLogger = auditLogger || new StructuredAuditLogger();
    this.refreshTokenLifetimeMs = options.refreshTokenLifetimeMs || 30 * 24 * 60 * 60 * 1000; // Default 30 days
    this.passwordHistoryLimit = options.passwordHistoryLimit || 5;
  }

  public setRefreshTokenLifetimeMs(lifetimeMs: number): void {
    this.refreshTokenLifetimeMs = lifetimeMs;
  }

  public async requestEduOtp(
    email: string,
    collegeId: string
  ): Promise<{ success: boolean; message: string; otpCode?: string }> {
    const otpCode = randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const key = `${collegeId}:${email.toLowerCase()}`;
    this.otpsStore.set(key, {
      email: email.toLowerCase(),
      collegeId,
      otpCode,
      expiresAt,
      isUsed: false
    });

    await this.auditLogger.logAction({
      collegeId,
      actorUserId: 'system-anon',
      actorRole: 'GUEST',
      action: 'EDU_OTP_REQUESTED',
      targetEntityId: email,
      targetEntityType: 'EMAIL',
      ipAddress: '127.0.0.1',
      userAgent: 'IdentityKernel'
    });

    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
      logger.debug({ email, collegeId }, 'EDU verification OTP generated');
    }
    return {
      success: true,
      message: 'OTP sent to EDU email',
      ...(isProduction ? {} : { otpCode })
    };
  }

  public async verifyOtpAndRegister(params: {
    email: string;
    otpCode: string;
    username: string;
    displayName: string;
    password: string;
    collegeId: string;
    role?: UserRole;
  }): Promise<{ success: boolean; user?: UserRecord; error?: string }> {
    const key = `${params.collegeId}:${params.email.toLowerCase()}`;
    const otpRecord = this.otpsStore.get(key);

    if (!otpRecord || otpRecord.isUsed || new Date() > otpRecord.expiresAt || otpRecord.otpCode !== params.otpCode) {
      observability.business.registrationFailure();
      return { success: false, error: 'INVALID_OR_EXPIRED_OTP' };
    }

    // Username global uniqueness check
    for (const u of this.usersStore.values()) {
      if (u.username.toLowerCase() === params.username.toLowerCase()) {
        observability.business.registrationFailure();
        return { success: false, error: 'USERNAME_TAKEN' };
      }
      if (u.collegeId === params.collegeId && u.email.toLowerCase() === params.email.toLowerCase()) {
        observability.business.registrationFailure();
        return { success: false, error: 'EMAIL_ALREADY_REGISTERED_IN_COLLEGE' };
      }
    }

    // Password strength check
    const pwdValidation = validatePasswordStrength(params.password);
    if (!pwdValidation.valid) {
      observability.business.registrationFailure();
      return { success: false, error: `WEAK_PASSWORD: ${pwdValidation.errors.join(', ')}` };
    }

    otpRecord.isUsed = true;

    const userId = randomUUID();
    const passwordHash = await hashPassword(params.password);

    const newUser: UserRecord = {
      id: userId,
      collegeId: params.collegeId,
      email: params.email.toLowerCase(),
      username: params.username,
      displayName: params.displayName,
      passwordHash,
      passwordHistory: [passwordHash],
      role: params.role || ('STUDENT' as UserRole),
      status: 'ACTIVE',
      isEmailVerified: true,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      anonymousTokenSalt: generateAnonymousToken(userId, params.collegeId),
      createdAt: new Date()
    };

    this.usersStore.set(userId, newUser);

    await this.auditLogger.logAction({
      collegeId: params.collegeId,
      actorUserId: userId,
      actorRole: newUser.role,
      action: 'USER_REGISTERED',
      targetEntityId: userId,
      targetEntityType: 'USER',
      ipAddress: '127.0.0.1',
      userAgent: 'IdentityKernel'
    });

    observability.business.registrationSuccess();
    return { success: true, user: newUser };
  }

  public async login(params: {
    identifier: string;
    password: string;
    collegeId: string;
    deviceId: string;
    deviceInfo: string;
    ipAddress: string;
    deviceMetadata?: DeviceSessionMetadata;
  }): Promise<{ success: boolean; accessToken?: string; refreshToken?: string; user?: UserRecord; error?: string }> {
    let targetUser: UserRecord | undefined;

    for (const u of this.usersStore.values()) {
      if (
        u.collegeId === params.collegeId &&
        (u.username.toLowerCase() === params.identifier.toLowerCase() ||
          u.email.toLowerCase() === params.identifier.toLowerCase())
      ) {
        targetUser = u;
        break;
      }
    }

    if (!targetUser) {
      observability.business.loginFailure();
      return { success: false, error: 'INVALID_CREDENTIALS' };
    }

    // Check account lockout
    if (targetUser.lockoutUntil && new Date() < targetUser.lockoutUntil) {
      observability.business.loginFailure();
      return { success: false, error: 'ACCOUNT_LOCKED_TEMPORARILY' };
    }

    // Verify Argon2id password
    const isPwdValid = await verifyPassword(params.password, targetUser.passwordHash);

    if (!isPwdValid) {
      targetUser.failedLoginAttempts += 1;

      if (targetUser.failedLoginAttempts >= 5) {
        targetUser.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        await this.auditLogger.logAction({
          collegeId: params.collegeId,
          actorUserId: targetUser.id,
          actorRole: targetUser.role,
          severity: 'SECURITY',
          action: 'ACCOUNT_LOCKED_FAILED_LOGINS',
          targetEntityId: targetUser.id,
          targetEntityType: 'USER',
          reason: '5 consecutive failed Argon2id password attempts',
          ipAddress: params.ipAddress,
          userAgent: params.deviceInfo
        });
      }

      observability.business.loginFailure();
      return { success: false, error: 'INVALID_CREDENTIALS' };
    }

    // Automatic Hash Rehashing when Argon2id parameters evolve
    if (needsRehash(targetUser.passwordHash, RECOMMENDED_ARGON2_OPTIONS)) {
      targetUser.passwordHash = await hashPassword(params.password);
      logger.info({ userId: targetUser.id }, 'Argon2id password hash automatically upgraded to latest parameters');
    }

    // Reset failed login counters
    targetUser.failedLoginAttempts = 0;
    targetUser.lockoutUntil = null;

    const sessionId = randomUUID();
    const refreshToken = `ref-${randomUUID()}`;
    const accessToken = `acc-${randomUUID()}`;
    const now = new Date();

    const session: SessionRecord = {
      sessionId,
      userId: targetUser.id,
      collegeId: params.collegeId,
      refreshToken,
      deviceId: params.deviceId,
      deviceInfo: params.deviceInfo,
      deviceName: params.deviceMetadata?.deviceName || 'Generic Device',
      platform: params.deviceMetadata?.platform || 'Web',
      browser: params.deviceMetadata?.browser || 'Browser',
      os: params.deviceMetadata?.os || 'OS',
      approximateLocation: params.deviceMetadata?.approximateLocation || 'Palo Alto, CA, USA',
      ipAddress: params.ipAddress,
      isRevoked: false,
      firstLoginAt: now,
      lastActiveAt: now,
      expiresAt: new Date(Date.now() + this.refreshTokenLifetimeMs) // Configurable (default 30 days)
    };

    this.sessionsStore.set(sessionId, session);

    await this.auditLogger.logAction({
      collegeId: params.collegeId,
      actorUserId: targetUser.id,
      actorRole: targetUser.role,
      action: 'LOGIN_SUCCESS',
      targetEntityId: sessionId,
      targetEntityType: 'SESSION',
      ipAddress: params.ipAddress,
      userAgent: params.deviceInfo
    });

    observability.business.loginSuccess();
    return {
      success: true,
      accessToken,
      refreshToken,
      user: targetUser
    };
  }

  public async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    const user = this.usersStore.get(userId);
    if (!user) return { success: false, error: 'USER_NOT_FOUND' };

    const isOldValid = await verifyPassword(oldPassword, user.passwordHash);
    if (!isOldValid) return { success: false, error: 'INVALID_OLD_PASSWORD' };

    const pwdVal = validatePasswordStrength(newPassword);
    if (!pwdVal.valid) return { success: false, error: `WEAK_PASSWORD: ${pwdVal.errors.join(', ')}` };

    // Prevent reuse of last 5 passwords
    const inHistory = await isPasswordInHistory(newPassword, user.passwordHistory, this.passwordHistoryLimit);
    if (inHistory) {
      return {
        success: false,
        error: `PASSWORD_REUSED: Cannot reuse any of your last ${this.passwordHistoryLimit} passwords.`
      };
    }

    const newHash = await hashPassword(newPassword);
    user.passwordHash = newHash;
    user.passwordHistory.push(newHash);
    if (user.passwordHistory.length > this.passwordHistoryLimit) {
      user.passwordHistory.shift();
    }

    await this.auditLogger.logAction({
      collegeId: user.collegeId,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'PASSWORD_CHANGED',
      targetEntityId: user.id,
      targetEntityType: 'USER',
      ipAddress: '127.0.0.1',
      userAgent: 'IdentityKernel'
    });

    return { success: true };
  }

  public async refreshSession(
    refreshToken: string,
    ipAddress: string
  ): Promise<{ success: boolean; newAccessToken?: string; newRefreshToken?: string; error?: string }> {
    let targetSession: SessionRecord | undefined;

    for (const s of this.sessionsStore.values()) {
      if (s.refreshToken === refreshToken) {
        targetSession = s;
        break;
      }
    }

    if (!targetSession || targetSession.isRevoked || new Date() > targetSession.expiresAt) {
      if (targetSession?.isRevoked) {
        // REFRESH TOKEN THEFT DETECTED! Revoke ALL active sessions for this user!
        await this.revokeAllSessions(targetSession.userId);
        await this.auditLogger.logAction({
          collegeId: targetSession.collegeId,
          actorUserId: targetSession.userId,
          actorRole: 'STUDENT',
          severity: 'CRITICAL',
          action: 'REFRESH_TOKEN_THEFT_REVOKE_ALL',
          targetEntityId: targetSession.userId,
          targetEntityType: 'USER',
          reason: 'Revoked refresh token reuse detected. All active device sessions invalidated.',
          ipAddress,
          userAgent: 'IdentityKernel'
        });
      }
      return { success: false, error: 'INVALID_REFRESH_TOKEN' };
    }

    // Revoke old session and rotate
    targetSession.isRevoked = true;

    const newSessionId = randomUUID();
    const newRefreshToken = `ref-${randomUUID()}`;
    const newAccessToken = `acc-${randomUUID()}`;
    const now = new Date();

    const newSession: SessionRecord = {
      ...targetSession,
      sessionId: newSessionId,
      refreshToken: newRefreshToken,
      ipAddress,
      isRevoked: false,
      lastActiveAt: now,
      expiresAt: new Date(Date.now() + this.refreshTokenLifetimeMs)
    };

    this.sessionsStore.set(newSessionId, newSession);
    return { success: true, newAccessToken, newRefreshToken };
  }

  public async revokeAllSessions(userId: string): Promise<void> {
    for (const s of this.sessionsStore.values()) {
      if (s.userId === userId) {
        s.isRevoked = true;
      }
    }
  }

  public getUser(userId: string): UserRecord | undefined {
    return this.usersStore.get(userId);
  }

  public getUserSessions(userId: string): SessionRecord[] {
    return Array.from(this.sessionsStore.values()).filter((s) => s.userId === userId && !s.isRevoked);
  }
}
