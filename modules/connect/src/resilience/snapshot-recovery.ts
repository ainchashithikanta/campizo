/**
 * Campus Connect — Snapshot Recovery & Cryptographic Verification
 * Provides checksum/HMAC integrity verification and point-in-time recovery for immutable recommendation snapshots.
 */

import { createHmac } from 'node:crypto';

export interface ProtectedSnapshot {
  id: string;
  collegeId: string;
  data: Record<string, any>;
  checksum: string;
  createdAt: string;
}

export class SnapshotRecovery {
  private readonly secretKey: string = 'college_hub_snapshot_key_2026';

  createChecksum(data: Record<string, any>): string {
    const serialized = JSON.stringify(data);
    return createHmac('sha256', this.secretKey).update(serialized).digest('hex');
  }

  createProtectedSnapshot(id: string, collegeId: string, payload: Record<string, any>): ProtectedSnapshot {
    const checksum = this.createChecksum(payload);
    return {
      id,
      collegeId,
      data: { ...payload },
      checksum,
      createdAt: new Date().toISOString()
    };
  }

  verifySnapshotIntegrity(snapshot: ProtectedSnapshot): boolean {
    const expected = this.createChecksum(snapshot.data);
    return snapshot.checksum === expected;
  }

  recoverPointInTime(snapshots: ProtectedSnapshot[], cutoffTimestamp: string): ProtectedSnapshot[] {
    const cutoff = new Date(cutoffTimestamp).getTime();
    return snapshots
      .filter((s) => new Date(s.createdAt).getTime() <= cutoff && this.verifySnapshotIntegrity(s))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}
