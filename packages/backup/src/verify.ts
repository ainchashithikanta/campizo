/**
 * College Hub Backup Platform (MS-57) — verification helpers.
 * Checksum comparison used by backup verification and DR drills.
 */

import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

export function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk as Buffer));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

export interface ChecksumReport {
  path: string;
  sha256: string;
}

/** Compute the checksum of a PostgreSQL logical dump (normalized pipeline output). */
export async function checksumOfBuffer(content: Buffer): Promise<string> {
  return createHash('sha256').update(content).digest('hex');
}

export function checksumsMatch(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
