'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import '../../../styles/confessions.css';
import { ConfessionsApiClient, ConfessionDTO } from '../../../lib/api-confessions';
import { FeedList, LoadingSkeleton } from '../../../components/confessions/ConfessionComponents';

export default function SearchConfessionsPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ConfessionDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const COLLEGE = 'college-nitk-003';

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setHasSearched(true);
    const res = await ConfessionsApiClient.searchConfessions(COLLEGE, query);
    if (res.success && res.data) {
      setResults(res.data);
    } else {
      setResults([]);
    }
    setLoading(false);
  };

  return (
    <div className="conf-container">
      <header className="conf-header">
        <Link href="/confessions" className="conf-action-btn">
          ← Back to Feed
        </Link>
        <h1 className="conf-title">🔍 Search Confessions</h1>
      </header>

      <form onSubmit={handleSearch} style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            className="conf-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keywords (e.g. OS exam, hostel cat)..."
            required
          />
          <button
            type="submit"
            className="conf-nav-link active"
            style={{ border: 'none', cursor: 'pointer', padding: '0.8rem 1.5rem' }}
          >
            Search
          </button>
        </div>
      </form>

      {loading && <LoadingSkeleton />}
      {!loading && hasSearched && <FeedList confessions={results} />}
    </div>
  );
}
