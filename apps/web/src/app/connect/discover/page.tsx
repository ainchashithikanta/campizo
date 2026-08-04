/**
 * Campus Connect — Discover Page
 * Route: /connect/discover
 * Displays grid/list of student compatibility cards with explainable match reasons. NO SWIPE UI.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { RecommendationCard } from '../../../components/connect/recommendation-card';
import { SearchBar, FilterSidebar } from '../../../components/connect/search-filter-components';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../../components/connect/state-components';
import { fetchRecommendations, sendConnectionRequest, type RecommendationItem } from '../../../lib/api-campus-connect';

export default function DiscoverPage() {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIntentType, setSelectedIntentType] = useState<string | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;
    fetchRecommendations(10)
      .then((res) => {
        if (isMounted) {
          setRecommendations(res.items || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load recommendations');
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleConnect = async (targetId: string) => {
    try {
      await sendConnectionRequest({ receiverProfileId: targetId, originatingIntentId: 'int_discover_default' });
      alert('Connection request sent!');
    } catch (err: any) {
      alert(err.message || 'Failed to send request');
    }
  };

  const filtered = recommendations.filter((r) => {
    const matchesSearch =
      !searchQuery ||
      r.targetStudentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.major?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <main className="max-w-6xl mx-auto p-6 font-sans">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Discover Campus Peers</h1>
        <p className="text-xs text-slate-500 mt-1">
          Grid view of compatible students based on shared courses, interests, and complementary skills.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <FilterSidebar selectedIntentType={selectedIntentType} onSelectIntentType={setSelectedIntentType} />
        </div>

        <div className="md:col-span-3">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search peers by name, major, or skills..."
          />

          {loading && <LoadingSkeleton count={4} />}
          {error && <ErrorState message={error} />}

          {!loading && !error && filtered.length === 0 && (
            <EmptyState
              title="No Discoverable Peers Found"
              description="Try broadening your search query or intent filter."
            />
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map((rec) => (
                <RecommendationCard key={rec.snapshotId} recommendation={rec} onConnect={handleConnect} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
