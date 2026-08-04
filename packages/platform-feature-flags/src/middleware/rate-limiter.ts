/**
 * Endpoint-Specific Rate Limiting Middleware
 */

import { ApplicationError } from '../errors/application-errors.js';

export class RateLimiter {
  private readonly counts: Map<string, { count: number; resetAt: number }> = new Map();

  checkRateLimit(key: string, limit: number = 1000, windowMs: number = 60000): void {
    const now = Date.now();
    const current = this.counts.get(key);

    if (!current || now > current.resetAt) {
      this.counts.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }

    if (current.count >= limit) {
      throw new ApplicationError(
        `Rate limit exceeded (${limit} requests per ${windowMs / 1000}s). Try again later.`,
        'RATE_LIMIT_EXCEEDED',
        429
      );
    }

    current.count++;
  }
}
