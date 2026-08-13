'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '@web/styles/admin.css';

const ADMIN_MODULES = [
  {
    href: '/admin/moderation',
    icon: '🛡️',
    title: 'Moderation Center',
    desc: 'Blind moderation queues for confessions and professor reviews: restore, hide, delete, escalate.',
    accent: 'green'
  },
  {
    href: '/admin/feature-flags',
    icon: '🚩',
    title: 'Feature Flags Console',
    desc: 'Kill switches, rollouts, audiences, approvals, audit trail, snapshots, and health.',
    accent: 'violet'
  },
  {
    href: '/admin/error-tracking',
    icon: '🚨',
    title: 'Error Tracking',
    desc: 'Incident pipeline (Open → Acknowledged → Investigating → Resolved → Closed), runbooks, and error explorer.',
    accent: 'red'
  }
];

export default function AdminIndexPage() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    await fetch('/admin/api/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  return (
    <div className="adx-page">
      <header className="adx-header">
        <div>
          <p className="adx-kicker">Campizo · Restricted</p>
          <h1 className="adx-title">Admin Console</h1>
        </div>
        <button onClick={handleLogout} className="adx-logout" disabled={signingOut}>
          {signingOut ? 'Signing out…' : '↪ Sign out'}
        </button>
      </header>

      <div className="adx-grid">
        {ADMIN_MODULES.map((m) => (
          <Link href={m.href} key={m.href} className={`adx-card adx-card-${m.accent}`}>
            <div className="adx-card-icon">{m.icon}</div>
            <h2 className="adx-card-title">{m.title}</h2>
            <p className="adx-card-desc">{m.desc}</p>
            <span className="adx-card-cta">Open Console →</span>
          </Link>
        ))}
      </div>

      <p className="adx-note">This area is PIN-protected. Unauthorized access attempts are denied and logged.</p>
    </div>
  );
}
