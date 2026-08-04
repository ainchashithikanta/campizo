export class PermissionCache {
  private cache = new Map<string, { allowed: boolean; expiresAt: number }>();
  private ttlMs: number;

  constructor(ttlMs = 30_000) {
    this.ttlMs = ttlMs;
  }

  public get(key: string): boolean | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.allowed;
  }

  public set(key: string, allowed: boolean): void {
    this.cache.set(key, { allowed, expiresAt: Date.now() + this.ttlMs });
  }

  public invalidateUser(userId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  public clearAll(): void {
    this.cache.clear();
  }
}
