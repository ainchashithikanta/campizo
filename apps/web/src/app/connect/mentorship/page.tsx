/**
 * Campus Connect — Mentorship Page
 * Route: /connect/mentorship
 */

'use client';

import React, { useState, useEffect } from 'react';
import { MentorshipCard } from '../../../components/connect/group-cards';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../../components/connect/state-components';
import { fetchMentorships, createMentorship, type MentorshipItem } from '../../../lib/api-campus-connect';

export default function MentorshipPage() {
  const [mentorships, setMentorships] = useState<MentorshipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMentorships()
      .then((res) => {
        setMentorships(res || [{ id: 'm_1', mentorId: 'usr_senior_david', menteeId: 'usr_me', status: 'ACTIVE' }]);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load mentorships');
        setLoading(false);
      });
  }, []);

  const handleRequest = async (mentorId: string) => {
    try {
      await createMentorship({ mentorId, menteeId: 'usr_me' });
      alert('Mentorship requested successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to request mentorship');
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-6 font-sans">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Peer Mentorship</h1>
        <p className="text-xs text-slate-500 mt-1">Connect with upperclassmen for course guidance and career advice.</p>
      </header>

      {loading && <LoadingSkeleton count={2} />}
      {error && <ErrorState message={error} />}

      {!loading && !error && (
        <div className="space-y-6">
          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">
              Active & Requested Mentorships
            </h2>
            {mentorships.length === 0 ? (
              <EmptyState
                title="No Mentorships Active"
                description="Request a mentor or offer mentorship to campus peers!"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mentorships.map((m) => (
                  <MentorshipCard key={m.id} mentorship={m} onRequest={handleRequest} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
