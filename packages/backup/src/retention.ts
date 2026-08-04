/**
 * College Hub Backup Platform (MS-57) — retention policy enforcement.
 * Idempotent: safe to run repeatedly; only deletes objects older than the
 * configured limits. Grouped by backup id (directory-style keys).
 */

import { logger } from '@college-hub/logger';
import { keyFor, BACKUP_KEY_PATHS, type ObjectStore } from './object-store/types.js';

export interface RetentionPolicy {
  /** Number of PostgreSQL full/logical snapshots to keep. */
  fullBackups: number;
  /** Age in hours beyond which archived WAL segments are deleted. */
  walHours: number;
  /** Number of Redis RDB snapshots to keep. */
  redisSnapshots: number;
  /** Number of MinIO mirrors to keep. */
  minioMirrors: number;
}

export interface RetentionReport {
  deletedObjects: string[];
  kept: Record<string, number>;
}

function groupIds(objects: Array<{ key: string }>, pathPrefix: string, prefix: string): string[] {
  const ids = new Set<string>();
  for (const object of objects) {
    const rel = object.key.replace(`${prefix}/${pathPrefix}/`, '');
    const id = rel.split('/')[0];
    if (id !== undefined && id.length > 0) {
      ids.add(id);
    }
  }
  return Array.from(ids).sort();
}

export class RetentionService {
  private readonly objectStore: ObjectStore;
  private readonly prefix: string;

  constructor(objectStore: ObjectStore, prefix: string) {
    this.objectStore = objectStore;
    this.prefix = prefix;
  }

  public async apply(policy: RetentionPolicy, now: Date = new Date()): Promise<RetentionReport> {
    const deleted: string[] = [];

    deleted.push(...(await this.applyIdRetention(BACKUP_KEY_PATHS.postgresFull, policy.fullBackups)));
    deleted.push(...(await this.applyIdRetention(BACKUP_KEY_PATHS.postgresBase, policy.fullBackups)));
    deleted.push(...(await this.applyIdRetention(BACKUP_KEY_PATHS.redisRdb, policy.redisSnapshots)));
    deleted.push(...(await this.applyIdRetention(BACKUP_KEY_PATHS.minioMirror, policy.minioMirrors)));
    deleted.push(...(await this.applyWalAgeRetention(policy.walHours, now)));

    logger.info(
      { deletedCount: deleted.length },
      deleted.length === 0
        ? 'Backup retention: nothing to delete'
        : `Backup retention: deleted ${deleted.length} objects`
    );
    return {
      deletedObjects: deleted,
      kept: {
        postgresFull: policy.fullBackups,
        postgresBase: policy.fullBackups,
        redisRdb: policy.redisSnapshots,
        minioMirrors: policy.minioMirrors
      }
    };
  }

  /** Keep the newest `keep` backup ids under a path; delete everything older (including manifests). */
  private async applyIdRetention(pathPrefix: string, keep: number): Promise<string[]> {
    const deleted: string[] = [];
    const listPrefix = `${this.prefix}/${pathPrefix}/`;
    const objects = await this.objectStore.list(listPrefix);
    const ids = groupIds(objects, pathPrefix, this.prefix);
    const idsToDelete = ids.slice(0, Math.max(0, ids.length - keep));
    const deleteSet = new Set(idsToDelete);
    for (const object of objects) {
      const rel = object.key.replace(listPrefix, '');
      const id = rel.split('/')[0];
      if (id !== undefined && deleteSet.has(id)) {
        await this.objectStore.delete(object.key);
        deleted.push(object.key);
      }
    }
    return deleted;
  }

  private async applyWalAgeRetention(walHours: number, now: Date): Promise<string[]> {
    const deleted: string[] = [];
    const listPrefix = `${this.prefix}/${BACKUP_KEY_PATHS.postgresWal}/`;
    const objects = await this.objectStore.list(listPrefix);
    const cutoff = now.getTime() - walHours * 3_600_000;
    for (const object of objects) {
      // WAL segment names embed the timeline+log sequence: 000000010000000000000001
      // We cannot derive wall-clock time from the name, so rely on
      // LastModified metadata exposed by the store when available.
      const lastModified = object.lastModified;
      if (lastModified === undefined) {
        continue;
      }
      if (lastModified.getTime() < cutoff) {
        await this.objectStore.delete(object.key);
        deleted.push(object.key);
      }
    }
    return deleted;
  }
}

export function defaultRetentionPolicy(): RetentionPolicy {
  return {
    fullBackups: 7,
    walHours: 72,
    redisSnapshots: 3,
    minioMirrors: 7
  };
}

export { keyFor };
