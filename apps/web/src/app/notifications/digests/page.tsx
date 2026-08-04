/**
 * Unified Notification Engine — Notification Digests History Page (MS-40 Production)
 * Route: /notifications/digests
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchNotificationDigests,
  generateNotificationDigest,
  type NotificationDigestJob
} from '../../../lib/api-notifications';

export default function NotificationDigestsPage() {
  const [digests, setDigests] = useState<NotificationDigestJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchNotificationDigests()
      .then((res) => {
        setDigests(res || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleGenerate = async (type: 'DAILY' | 'WEEKLY') => {
    setGenerating(true);
    try {
      const job = await generateNotificationDigest(type);
      setDigests((prev) => [job, ...prev]);
      setGenerating(false);
    } catch (err: any) {
      alert(err.message || 'Failed to generate digest');
      setGenerating(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-6 font-sans">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">Notification Digests</h1>
          <p className="text-sm text-slate-500 mt-1">Aggregated daily and weekly summary reports.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleGenerate('DAILY')}
            disabled={generating}
            className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
          >
            {generating ? 'Generating...' : '+ Generate Daily Digest'}
          </button>
          <Link
            href="/notifications"
            className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
          >
            ← Back to Inbox
          </Link>
        </div>
      </header>

      {loading && <p className="text-xs text-slate-400 p-6 text-center">Loading digests...</p>}

      {!loading && digests.length === 0 && (
        <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50">
          <span className="text-3xl">📰</span>
          <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base mt-2">No Digests Generated</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            You have no archived notification digests. Click above to bundle unread updates.
          </p>
        </div>
      )}

      {!loading && digests.length > 0 && (
        <div className="space-y-4">
          {digests.map((d) => (
            <div
              key={d.id}
              className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-600">
                    {d.digestType} DIGEST
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {d.itemsCount} Updates Bundled
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Covering period from {new Date(d.periodStart).toLocaleDateString()} to{' '}
                  {new Date(d.periodEnd).toLocaleDateString()}
                </p>
              </div>
              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600">
                {d.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
