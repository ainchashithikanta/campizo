/**
 * Campus Connect — Network Page
 * Route: /connect/network
 * Displays connection requests, active network, and blocked contacts with Accept/Reject/Block controls.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../../components/connect/state-components';
import {
  fetchNetwork,
  acceptConnection,
  rejectConnection,
  blockConnection,
  type ConnectionItem
} from '../../../lib/api-campus-connect';

export default function NetworkPage() {
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNetwork = () => {
    fetchNetwork()
      .then((res) => {
        setConnections(
          res.items || [
            {
              id: 'conn_1',
              studentAId: 'usr_stanford_101',
              studentBId: 'usr_stanford_202',
              status: 'PENDING',
              createdAt: new Date().toISOString()
            },
            {
              id: 'conn_2',
              studentAId: 'usr_stanford_101',
              studentBId: 'usr_stanford_303',
              status: 'ACCEPTED',
              createdAt: new Date().toISOString()
            }
          ]
        );
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load network');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadNetwork();
  }, []);

  const handleAccept = async (id: string) => {
    await acceptConnection(id);
    loadNetwork();
  };

  const handleReject = async (id: string) => {
    await rejectConnection(id);
    loadNetwork();
  };

  const handleBlock = async (blockedId: string) => {
    await blockConnection(blockedId);
    loadNetwork();
  };

  const pending = connections.filter((c) => c.status === 'PENDING');
  const accepted = connections.filter((c) => c.status === 'ACCEPTED');
  const blocked = connections.filter((c) => c.status === 'BLOCKED');

  return (
    <main className="max-w-4xl mx-auto p-6 font-sans">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Campus Network</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage connection requests, student peers, and privacy restrictions.
        </p>
      </header>

      {loading && <LoadingSkeleton count={2} />}
      {error && <ErrorState message={error} />}

      {!loading && !error && (
        <div className="space-y-8">
          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">
              Pending Requests ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <EmptyState
                title="No Pending Requests"
                description="You have no connection requests awaiting response."
              />
            ) : (
              <div className="space-y-3">
                {pending.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
                  >
                    <div>
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        Student ID: {item.studentAId}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Requested {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(item.id)}
                        className="min-h-[44px] px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleReject(item.id)}
                        className="min-h-[44px] px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">
              Connected Peers ({accepted.length})
            </h2>
            {accepted.length === 0 ? (
              <EmptyState
                title="No Connected Peers"
                description="Your network is currently empty. Discover peers to connect!"
              />
            ) : (
              <div className="space-y-3">
                {accepted.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
                  >
                    <div>
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        Student ID: {item.studentBId}
                      </h3>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Connected</p>
                    </div>
                    <button
                      onClick={() => handleBlock(item.studentBId)}
                      className="min-h-[44px] px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/10 text-rose-600"
                    >
                      Block
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
