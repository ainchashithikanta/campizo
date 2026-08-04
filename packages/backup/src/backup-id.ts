/**
 * College Hub Backup Platform (MS-57) — backup identifier helper.
 * ISO-8601 based but with colons stripped so ids are valid on every
 * filesystem (Windows) as well as in S3 object keys, and remain
 * lexicographically sortable (newest last, same as ISO ordering).
 */

export function createBackupId(now: Date = new Date()): string {
  return now.toISOString().replace(/:/g, '-');
}
