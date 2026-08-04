'use client';

import React from 'react';
import Link from 'next/link';
import '../../../styles/confessions.css';
import { EmptyState } from '../../../components/confessions/ConfessionComponents';

export default function MyActivityPage() {
  return (
    <div className="conf-container">
      <header className="conf-header">
        <Link href="/confessions" className="conf-action-btn">
          ← Back to Feed
        </Link>
        <h1 className="conf-title">⚡ My Activity</h1>
      </header>

      <EmptyState message="No recent activity recorded for your anonymous pseudonyms." />
    </div>
  );
}
