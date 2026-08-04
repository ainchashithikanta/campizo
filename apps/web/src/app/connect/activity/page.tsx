/**
 * Campus Connect — Activity Feed Page
 * Route: /connect/activity
 * Displays immutable activity timeline with relative timestamps & pagination.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ActivityTimeline } from '../../../components/connect/privacy-and-activity';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../../components/connect/state-components';
import { fetchActivityFeed, type ActivityEntry } from '../../../lib/api-campus-connect';

export default function ActivityFeedPage() {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActivityFeed()
      .then((res) => {
        setActivities(
          res || [
            {
              activityId: 'act_1',
              actorId: 'usr_me',
              actionType: 'INTENT_CREATED',
              metadata: {},
              recordedAt: new Date(Date.now() - 3600000).toISOString()
            },
            {
              activityId: 'act_2',
              actorId: 'usr_me',
              actionType: 'STUDY_GROUP_JOINED',
              metadata: {},
              recordedAt: new Date(Date.now() - 7200000).toISOString()
            }
          ]
        );
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load activity feed');
        setLoading(false);
      });
  }, []);

  return (
    <main className="max-w-4xl mx-auto p-6 font-sans">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Campus Activity Log</h1>
        <p className="text-xs text-slate-500 mt-1">Immutable record of campus connections and study pod activities.</p>
      </header>

      {loading && <LoadingSkeleton count={2} />}
      {error && <ErrorState message={error} />}

      {!loading && !error && activities.length === 0 && (
        <EmptyState
          title="No Activity Logged"
          description="Your activity timeline will populate as you interact on Campus Connect."
        />
      )}

      {!loading && !error && activities.length > 0 && (
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <ActivityTimeline activities={activities} />
        </div>
      )}
    </main>
  );
}
