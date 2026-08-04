/**
 * Campus Connect — Recommendations Page
 * Route: /connect/recommendations
 * Displays explainable recommendation cards with percentage match & human-readable match reasons.
 * NEVER EXPOSES RAW INTERNAL RECOMMENDATION SCORES OR WEIGHTS.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { RecommendationCard } from '../../../components/connect/recommendation-card';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../../components/connect/state-components';
import { fetchRecommendations, sendConnectionRequest, type RecommendationItem } from '../../../lib/api-campus-connect';

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations(10)
      .then((res) => {
        setRecommendations(res.items || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load recommendations');
        setLoading(false);
      });
  }, []);

  const handleConnect = async (targetId: string) => {
    try {
      await sendConnectionRequest({ receiverProfileId: targetId, originatingIntentId: 'int_rec_page' });
      alert('Connection request sent!');
    } catch (err: any) {
      alert(err.message || 'Failed to send request');
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-6 font-sans">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">AI Campus Recommendations</h1>
        <p className="text-xs text-slate-500 mt-1">
          Explainable student compatibility recommendations based on shared courses and study goals.
        </p>
      </header>

      {loading && <LoadingSkeleton count={3} />}
      {error && <ErrorState message={error} />}

      {!loading && !error && recommendations.length === 0 && (
        <EmptyState
          title="No Recommendations Available"
          description="Recommendations will refresh as more study intents and course enrollments are active."
        />
      )}

      {!loading && !error && recommendations.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {recommendations.map((rec) => (
            <RecommendationCard key={rec.snapshotId} recommendation={rec} onConnect={handleConnect} />
          ))}
        </div>
      )}
    </main>
  );
}
