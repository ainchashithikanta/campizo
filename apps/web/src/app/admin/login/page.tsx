'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import '@web/styles/admin.css';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/admin/feature-flags';

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/admin/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || 'Invalid PIN');
        setLoading(false);
        return;
      }

      router.push(from);
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="adl-page">
      <div className="adl-glow adl-glow-1" />
      <div className="adl-glow adl-glow-2" />

      <div className="adl-card">
        <Link href="/" className="adl-back">
          ← Back to Campizo
        </Link>

        <div className="adl-brand">CZ</div>
        <h1 className="adl-title">Admin Console</h1>
        <p className="adl-subtitle">
          Restricted area. Enter your admin PIN to manage feature flags, kill switches, and incident tracking.
        </p>

        <form onSubmit={handleSubmit} className="adl-form">
          <label htmlFor="admin-pin" className="adl-label">
            Admin PIN
          </label>
          <input
            id="admin-pin"
            type="password"
            className="adl-input"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••••••••"
            autoFocus
            autoComplete="current-password"
          />
          {error && <p className="adl-error" role="alert">⛔ {error}</p>}
          <button type="submit" className="adl-btn" disabled={loading || pin.length === 0}>
            {loading ? 'Verifying…' : 'Unlock Admin Console'}
          </button>
        </form>

        <p className="adl-hint">Authorized personnel only. All access attempts are logged.</p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}
