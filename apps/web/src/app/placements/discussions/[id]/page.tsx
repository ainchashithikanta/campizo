/**
 * Placement Knowledge Base — Discussion Thread Detail & Answers Page
 * Route: /placements/discussions/[id]
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { LoadingSkeleton, ErrorState } from '../../../../components/connect/state-components';
import { fetchDiscussionById, createReply, voteDiscussion, voteReply, type DiscussionThread } from '../../../../lib/api-placement-guidance';

export default function DiscussionDetailPage() {
  const params = useParams();
  const id = String(params?.id || 'disc_sys_design_01');

  const [thread, setThread] = useState<DiscussionThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    fetchDiscussionById(id)
      .then((res) => {
        setThread(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load discussion thread');
        setLoading(false);
      });
  }, [id]);

  const handleVoteThread = async (direction: 'UPVOTE' | 'DOWNVOTE') => {
    if (!thread) return;
    try {
      const updated = await voteDiscussion(thread.id, direction);
      setThread((prev) => (prev ? { ...prev, upvotesCount: updated.upvotesCount, downvotesCount: updated.downvotesCount } : prev));
    } catch {
      // Retain UI
    }
  };

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thread || !replyText) return;
    try {
      const newReply = await createReply(thread.id, replyText);
      setThread((prev) => (prev ? { ...prev, repliesCount: prev.repliesCount + 1, replies: [...(prev.replies || []), newReply] } : prev));
      setReplyText('');
    } catch (err: any) {
      alert(err.message || 'Failed to post reply');
    }
  };

  if (loading) return <main className="max-w-4xl mx-auto p-6"><LoadingSkeleton count={3} /></main>;
  if (error) return <main className="max-w-4xl mx-auto p-6"><ErrorState message={error} /></main>;
  if (!thread) return null;

  return (
    <main className="max-w-4xl mx-auto p-6 font-sans">
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            #{thread.topic}
          </span>
          <span className="text-xs text-slate-400">• Asked by {thread.authorName}</span>
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mb-3">{thread.title}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap mb-4">{thread.content}</p>

        <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => handleVoteThread('UPVOTE')}
            className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center gap-1"
          >
            ▲ Upvote ({thread.upvotesCount})
          </button>
          <button
            type="button"
            onClick={() => handleVoteThread('DOWNVOTE')}
            className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1"
          >
            ▼ Downvote ({thread.downvotesCount})
          </button>
        </div>
      </div>

      <section className="mb-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
          Answers & Peer Solutions ({thread.replies?.length || 0})
        </h2>

        {thread.replies && thread.replies.length > 0 ? (
          <div className="space-y-3">
            {thread.replies.map((rep) => (
              <div key={rep.id} className={`p-5 rounded-2xl border ${rep.isAcceptedAnswer ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`}>
                {rep.isAcceptedAnswer && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-white mb-2 inline-block">
                    ✓ Accepted Answer
                  </span>
                )}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{rep.authorName}</span>
                  <span className="text-[11px] text-slate-400">{new Date(rep.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">{rep.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No answers posted yet. Be the first to help out!</p>
        )}
      </section>

      <form onSubmit={handlePostReply} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">Your Answer</h3>
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Write your detailed peer solution or advice..."
          rows={4}
          required
          className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            className="min-h-[44px] px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            Post Answer
          </button>
        </div>
      </form>
    </main>
  );
}
