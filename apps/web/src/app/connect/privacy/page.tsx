/**
 * Campus Connect — Privacy Center Page
 * Route: /connect/privacy
 * Explains and toggles Ghost mode, Incognito mode, and visibility settings clearly.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { PrivacyPanel } from '../../../components/connect/privacy-and-activity';
import { LoadingSkeleton, ErrorState } from '../../../components/connect/state-components';
import { fetchPrivacySettings, updatePrivacySettings, type PrivacySettings } from '../../../lib/api-campus-connect';

export default function PrivacyCenterPage() {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPrivacySettings()
      .then((data) => {
        setSettings(data || { studentProfileId: 'usr_me', isGhostMode: false, isIncognitoMode: false, version: 1 });
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load privacy settings');
        setLoading(false);
      });
  }, []);

  const handleToggle = async (key: 'isGhostMode' | 'isIncognitoMode', value: boolean) => {
    if (!settings) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);

    try {
      await updatePrivacySettings({
        isGhostMode: updated.isGhostMode,
        isIncognitoMode: updated.isIncognitoMode,
        version: updated.version
      });
    } catch (err: any) {
      alert(err.message || 'Failed to update privacy settings');
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-6 font-sans">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Privacy Center</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure your profile visibility and anonymous browsing controls.
        </p>
      </header>

      {loading && <LoadingSkeleton count={1} />}
      {error && <ErrorState message={error} />}

      {!loading && !error && settings && <PrivacyPanel settings={settings} onToggle={handleToggle} />}
    </main>
  );
}
