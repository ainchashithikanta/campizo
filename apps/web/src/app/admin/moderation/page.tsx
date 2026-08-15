'use client';

import React from 'react';
import Link from 'next/link';
import '@web/styles/admin.css';

const MODERATION_MODULES = [
  {
    href: '/admin/moderation/confessions',
    icon: '💭',
    title: 'Confession Moderation',
    desc: 'Blind moderation queue for campus confessions: restore, hide, delete, or escalate reported content.',
    accent: 'violet'
  },
  {
    href: '/admin/moderation/professors',
    icon: '🎓',
    title: 'Professor Review Moderation',
    desc: 'Queue for professor reviews flagged by the risk scanner: approve, hide, reject, or restore.',
    accent: 'red'
  },
  {
    href: '/admin/professors',
    icon: '👩‍🏫',
    title: 'Professor Management',
    desc: 'NITK faculty directory: search, add, edit, and remove professors department-wise.',
    accent: 'blue'
  }
];

export default function AdminModerationHubPage() {
  return (
    <div className="adx-page">
      <header className="adx-header">
        <div>
          <Link href="/admin" className="adx-back">
            ← Admin Console
          </Link>
          <p className="adx-kicker">Campizo · Restricted</p>
          <h1 className="adx-title">🛡️ Moderation Center</h1>
        </div>
      </header>

      <div className="adx-grid">
        {MODERATION_MODULES.map((m) => (
          <Link href={m.href} key={m.href} className={`adx-card adx-card-${m.accent}`}>
            <div className="adx-card-icon">{m.icon}</div>
            <h2 className="adx-card-title">{m.title}</h2>
            <p className="adx-card-desc">{m.desc}</p>
            <span className="adx-card-cta">Open Queue →</span>
          </Link>
        ))}
      </div>

      <p className="adx-note">
        Author identities are fully blinded in every queue. All moderation actions are recorded in the audit log.
      </p>
    </div>
  );
}
