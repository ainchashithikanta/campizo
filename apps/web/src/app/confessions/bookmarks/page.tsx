'use client';

import React from 'react';
import Link from 'next/link';
import '../../../styles/confessions.css';
import { EmptyState } from '../../../components/confessions/ConfessionComponents';

export default function BookmarksPage() {
  return (
    <div className="conf-container">
      <header className="conf-header">
        <Link href="/confessions" className="conf-action-btn">
          ← Back to Feed
        </Link>
        <h1 className="conf-title">🔖 Saved Bookmarks</h1>
      </header>

      <EmptyState message="You haven't saved any confessions yet." />
    </div>
  );
}
