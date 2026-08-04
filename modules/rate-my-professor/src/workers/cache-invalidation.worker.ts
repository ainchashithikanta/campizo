import { logger } from '@college-hub/logger';

export class CacheInvalidationWorker {
  private invalidatedKeys: string[] = [];

  public invalidateProfessorCache(collegeId: string, professorSlug: string, professorId?: string): string[] {
    const keys = [
      `college:${collegeId}:prof:${professorSlug}`,
      `college:${collegeId}:prof:${professorSlug}:stats`,
      `college:${collegeId}:prof:search:*`
    ];

    if (professorId) {
      keys.push(`college:${collegeId}:prof:${professorId}:reviews`);
    }

    logger.info(
      { collegeId, professorSlug, professorId, invalidatedKeys: keys },
      'Invalidated targeted Redis/memory cache keys for professor profile & statistics.'
    );

    this.invalidatedKeys.push(...keys);
    return keys;
  }

  public getInvalidatedKeys(): string[] {
    return [...this.invalidatedKeys];
  }

  public clearLog(): void {
    this.invalidatedKeys = [];
  }
}
