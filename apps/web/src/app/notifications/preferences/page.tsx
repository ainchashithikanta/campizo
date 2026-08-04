/**
 * Unified Notification Engine — Preferences & Rules Configuration Page (MS-40 Production)
 * Route: /notifications/preferences
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchNotificationRules, updateNotificationRules, type NotificationUserRule } from '../../../lib/api-notifications';

export default function NotificationPreferencesPage() {
  const [rules, setRules] = useState<NotificationUserRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchNotificationRules()
      .then((res) => {
        setRules(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rules) return;
    setSaving(true);
    setSuccessMsg(null);
    try {
      const updated = await updateNotificationRules(rules);
      setRules(updated);
      setSuccessMsg('Notification rules & quiet hours saved successfully!');
      setSaving(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update notification rules');
      setSaving(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-6 font-sans">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">Notification Preferences & Rules</h1>
          <p className="text-sm text-slate-500 mt-1">Configure Quiet Hours, Digest Frequencies, and Category Muting.</p>
        </div>
        <Link
          href="/notifications/digests"
          className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
        >
          📰 View Digests
        </Link>
      </header>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-6">
          ✓ {successMsg}
        </div>
      )}

      {loading && <p className="text-xs text-slate-400 p-6 text-center">Loading preferences...</p>}

      {!loading && rules && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Quiet Hours Card */}
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">🌙 Quiet Hours Schedule</h3>
                <p className="text-xs text-slate-500 mt-0.5">Suppress non-urgent notifications during sleep or study hours.</p>
              </div>
              <input
                type="checkbox"
                checked={rules.quietHoursEnabled}
                onChange={(e) => setRules({ ...rules, quietHoursEnabled: e.target.checked })}
                className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            {rules.quietHoursEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={rules.quietHoursStart}
                    onChange={(e) => setRules({ ...rules, quietHoursStart: e.target.value })}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">End Time</label>
                  <input
                    type="time"
                    value={rules.quietHoursEnd}
                    onChange={(e) => setRules({ ...rules, quietHoursEnd: e.target.value })}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Timezone</label>
                  <select
                    value={rules.timezone}
                    onChange={(e) => setRules({ ...rules, timezone: e.target.value })}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
                  >
                    <option value="UTC">UTC</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Digest Delivery Options */}
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 mb-1">📦 Digest Frequency</h3>
            <p className="text-xs text-slate-500 mb-4">Choose how frequently non-urgent updates are delivered.</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['INSTANT', 'DAILY', 'WEEKLY'] as const).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setRules({ ...rules, digestFrequency: freq })}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    rules.digestFrequency === freq
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200 font-bold'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs uppercase tracking-wider font-extrabold">{freq}</div>
                  <div className="text-[11px] font-normal text-slate-500 mt-1">
                    {freq === 'INSTANT' && 'Receive alerts immediately'}
                    {freq === 'DAILY' && 'Bundle into 9 AM daily summary'}
                    {freq === 'WEEKLY' && 'Bundle into Monday morning summary'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="min-h-[48px] px-8 py-3 text-xs font-semibold rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors shadow-lg shadow-indigo-500/20"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
