'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import '../../../styles/confessions.css';
import { ConfessionsApiClient, ModerationCaseDTO } from '../../../lib/api-confessions';
import { ModerationCaseCard, LoadingSkeleton, EmptyState } from '../../../components/confessions/ConfessionComponents';

export default function ModerationQueuePage() {
  const [cases, setCases] = useState<ModerationCaseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const COLLEGE = 'college-stanford-001';

  useEffect(() => {
    async function loadQueue() {
      setLoading(true);
      const res = await ConfessionsApiClient.fetchModerationQueue(COLLEGE);
      if (res.success && res.data) {
        setCases(res.data);
      } else {
        // Fallback mock moderation queue
        setCases([
          {
            id: 'case-101',
            collegeId: COLLEGE,
            confessionId: 'conf-quarantined-1',
            severityLevel: 1,
            status: 'QUARANTINED',
            totalReports: 3,
            createdAt: new Date().toISOString(),
            authorIdentity: 'BLIND'
          }
        ]);
      }
      setLoading(false);
    }

    loadQueue();
  }, []);

  return (
    <div className="conf-container">
      <header className="conf-header">
        <Link href="/confessions" className="conf-action-btn">
          ← Back to Feed
        </Link>
        <h1 className="conf-title">🛡️ Moderation Queue</h1>
      </header>

      {loading ? (
        <LoadingSkeleton />
      ) : cases.length === 0 ? (
        <EmptyState message="No pending moderation cases in queue." />
      ) : (
        cases.map((c) => <ModerationCaseCard key={c.id} modCase={c} />)
      )}
    </div>
  );
}
