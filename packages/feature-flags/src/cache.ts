import type { FeatureFlagRule } from './types.js';

interface CacheEntry {
  rule: FeatureFlagRule;
  expiresAt: number;
}

export class FeatureFlagCache {
  private cache = new Map<string, CacheEntry>();
  private defaultTtlMs: number;

  constructor(ttlMs = 60_000) {
    this.defaultTtlMs = ttlMs;
  }

  public get(key: string): FeatureFlagRule | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.rule;
  }

  public set(key: string, rule: FeatureFlagRule, ttlMs = this.defaultTtlMs): void {
    this.cache.set(key, {
      rule,
      expiresAt: Date.now() + ttlMs
    });
  }

  public invalidate(key: string): void {
    this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
  }
}
