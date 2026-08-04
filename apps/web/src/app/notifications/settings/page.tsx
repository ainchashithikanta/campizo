/**
 * Unified Notification Engine — Notification Preferences Page
 * Route: /notifications/settings
 */

'use client';

import React, { useState } from 'react';
import { updateNotificationPreferences } from '../../../lib/api-notifications';

export default function NotificationSettingsPage() {
  const [inAppMuted, setInAppMuted] = useState(false);
  const [emailMuted, setEmailMuted] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateNotificationPreferences({
        channel: 'IN_APP',
        isMuted: inAppMuted
      });
      alert('Preferences saved successfully!');
      setSaving(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save preferences');
      setSaving(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-6 font-sans">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Notification Preferences</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage delivery channels and event notifications across College Hub modules.
        </p>
      </header>

      <form
        onSubmit={handleSave}
        className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">In-App Notifications</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Receive realtime drawer alerts and unread badges on web desktop and mobile.
              </p>
            </div>
            <input
              type="checkbox"
              checked={!inAppMuted}
              onChange={(e) => setInAppMuted(!e.target.checked)}
              className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Email Digest Notifications (Plug-in Ready)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Receive daily summary emails for important updates.</p>
            </div>
            <input
              type="checkbox"
              checked={!emailMuted}
              onChange={(e) => setEmailMuted(!e.target.checked)}
              className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="min-h-[48px] px-6 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </main>
  );
}
