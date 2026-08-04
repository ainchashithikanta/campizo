/**
 * Placement Knowledge Base — Question Detail Page
 * Route: /placements/questions/[id]
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { LoadingSkeleton, ErrorState } from '../../../../components/connect/state-components';
import { fetchQuestionById, markQuestionHelpful, type QuestionBankItem } from '../../../../lib/api-placement-guidance';

export default function QuestionDetailPage() {
  const params = useParams();
  const id = String(params?.id || 'q_word_ladder_2');

  const [question, setQuestion] = useState<QuestionBankItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestionById(id)
      .then((res) => {
        setQuestion(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load question details');
        setLoading(false);
      });
  }, [id]);

  const handleHelpful = async () => {
    if (!question) return;
    try {
      const updated = await markQuestionHelpful(question.id);
      setQuestion(updated);
    } catch {
      // Retain UI
    }
  };

  if (loading) return <main className="max-w-4xl mx-auto p-6"><LoadingSkeleton count={2} /></main>;
  if (error) return <main className="max-w-4xl mx-auto p-6"><ErrorState message={error} /></main>;
  if (!question) return null;

  return (
    <main className="max-w-4xl mx-auto p-6 font-sans">
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            {question.companyName}
          </span>
          <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            #{question.topic}
          </span>
          <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${question.difficulty === 'HARD' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'}`}>
            {question.difficulty}
          </span>
        </div>

        <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mb-3">"{question.questionText}"</h1>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3">
          <span>Role: {question.roleTitle}</span>
          <span>• Round: {question.roundType.replace('_', ' ')}</span>
          <span>• Asked {question.frequencyCount} times</span>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/50">
        <button
          type="button"
          onClick={handleHelpful}
          className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
        >
          👍 Helpful ({question.helpfulCount})
        </button>

        <Link
          href={`/placements/discussions?query=${encodeURIComponent(question.topic)}`}
          className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 transition-colors flex items-center"
        >
          💬 Join Community Discussion →
        </Link>
      </div>
    </main>
  );
}
