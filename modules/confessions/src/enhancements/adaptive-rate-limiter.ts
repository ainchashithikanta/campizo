export interface RateLimitDimension {
  userId?: string;
  ipAddress?: string;
  deviceId?: string;
  collegeId: string;
}

export interface RateLimitPolicy {
  maxRequests: number;
  windowMs: number;
}

export class AdaptiveRateLimiter {
  private records = new Map<string, { count: number; expiresAt: number }>();

  checkLimit(
    dimension: RateLimitDimension,
    action: 'CONFESS' | 'COMMENT' | 'VOTE' | 'REPORT' | 'SEARCH'
  ): { allowed: boolean; remaining: number; resetMs: number } {
    const limits: Record<string, RateLimitPolicy> = {
      CONFESS: { maxRequests: 5, windowMs: 3600 * 1000 },
      COMMENT: { maxRequests: 30, windowMs: 3600 * 1000 },
      VOTE: { maxRequests: 120, windowMs: 60 * 1000 },
      REPORT: { maxRequests: 10, windowMs: 3600 * 1000 },
      SEARCH: { maxRequests: 60, windowMs: 60 * 1000 }
    };

    const policy = limits[action] || { maxRequests: 100, windowMs: 60000 };
    const key = `${dimension.collegeId}:${dimension.userId || dimension.ipAddress || dimension.deviceId || 'anon'}:${action}`;

    const now = Date.now();
    const entry = this.records.get(key);

    if (!entry || now > entry.expiresAt) {
      this.records.set(key, { count: 1, expiresAt: now + policy.windowMs });
      return { allowed: true, remaining: policy.maxRequests - 1, resetMs: policy.windowMs };
    }

    if (entry.count >= policy.maxRequests) {
      return { allowed: false, remaining: 0, resetMs: entry.expiresAt - now };
    }

    entry.count += 1;
    return { allowed: true, remaining: policy.maxRequests - entry.count, resetMs: entry.expiresAt - now };
  }
}
