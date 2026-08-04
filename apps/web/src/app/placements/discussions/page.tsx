/**
 * Placement Knowledge Base — Community Q&A Discussions Feed Page
 * Route: /placements/discussions
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SearchBar } from '../../../components/connect/search-filter-components';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../../components/connect/state-components';
import { fetchDiscussions, createDiscussion, type DiscussionThread } from '../../../lib/api-placement-guidance';

export default function DiscussionsPage() {
  const [threads, setThreads] = useState<DiscussionThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTopic, setNewTopic] = useState('System Design');

  useEffect(() => {
    fetchDiscussions()
      .then((res) => {
        setThreads(res.items || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load discussions');
        setLoading(false);
      });
  }, []);

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContent) return;
    try {
      const created = await createDiscussion({ title: newTitle, content: newContent, topic: newTopic });
      setThreads((prev) => [created, ...prev]);
      setShowModal(false);
      setNewTitle('');
      setNewContent('');
    } catch (err: any) {
      alert(err.message || 'Failed to post thread');
    }
  };

  const filtered = threads.filter((t) => {
    return (
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.topic.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <main className="max-w-5xl mx-auto p-6 font-sans">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">Placement Community Q&A</h1>
          <p className="text-sm text-slate-500 mt-1">
            Stack Overflow style peer discussions, interview strategy, and answer reviews.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="min-h-[48px] px-5 py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1"
        >
          + Ask Question
        </button>
      </header>

      <div className="mb-6">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search discussion topics or questions..."
        />
      </div>

      {loading && <LoadingSkeleton count={3} />}
      {error && <ErrorState message={error} />}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState title="No Discussions Found" description="Be the first student to start a Q&A thread!" />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map((t) => (
            <article
              key={t.id}
              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex gap-4"
            >
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center min-w-[70px]">
                <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">{t.upvotesCount}</span>
                <span className="text-[10px] text-slate-400 uppercase font-mono">Votes</span>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    #{t.topic}
                  </span>
                  <span className="text-[11px] text-slate-400">Asked by {t.authorName}</span>
                </div>

                <Link href={`/placements/discussions/${t.id}`} className="group">
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors mb-1">
                    {t.title}
                  </h3>
                </Link>
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{t.content}</p>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                  <span>💬 {t.repliesCount} Answers</span>
                  <span>👁️ {t.viewsCount} Views</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Start New Discussion Thread</h2>
            <form onSubmit={handleCreateThread} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Topic</label>
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  required
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. How to approach System Design for Google L4?"
                  required
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Question Details
                </label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={4}
                  required
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Post Discussion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
