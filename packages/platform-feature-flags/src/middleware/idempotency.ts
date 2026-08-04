/**
 * Idempotency Middleware
 * Caches write operation results by idempotencyKey to prevent duplicate execution.
 */

export class IdempotencyStore {
  private readonly store: Map<string, { statusCode: number; body: unknown }> = new Map();

  get(key: string): { statusCode: number; body: unknown } | null {
    return this.store.get(key) || null;
  }

  save(key: string, statusCode: number, body: unknown): void {
    this.store.set(key, { statusCode, body });
  }
}
