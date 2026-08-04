/**
 * Placement Knowledge Base — Question Bank Search Page
 * Route: /placements/questions
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SearchBar } from '../../../components/connect/search-filter-components';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../../components/connect/state-components';
import { fetchQuestions, markQuestionHelpful, type QuestionBankItem } from '../../../lib/api-placement-guidance';

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchQuestions()
      .then((res) => {
        setQuestions(res.items || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load question bank');
        setLoading(false);
      });
  }, []);

  const handleHelpful = async (id: string) => {
    try {
      const updated = await markQuestionHelpful(id);
      setQuestions((prev) => prev.map((q) => (q.id === id ? updated : q)));
    } catch {
      // Retain UI
    }
  };

  const filtered = questions.filter((q) => {
    const matchesSearch =
      !searchQuery ||
      q.questionText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.topic.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDiff = !selectedDifficulty || q.difficulty === selectedDifficulty;
    return matchesSearch && matchesDiff;
  });

  return (
    <main className="max-w-6xl mx-auto p-6 font-sans">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">Interview Question Bank</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real interview questions asked across tech companies with difficulty, topic tags, and frequency counts.
          </p>
        </div>
        <Link
          href="/placements/discussions"
          className="min-h-[48px] px-5 py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center"
        >
          💬 Ask Community Q&A
        </Link>
      </header>

      <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
        <div className="flex-1 w-full">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search question text, company, or topic (e.g. Word Ladder, Graphs)..."
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSelectedDifficulty(undefined)}
            className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-semibold ${selectedDifficulty === undefined ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
          >
            All Difficulties
          </button>
          <button
            type="button"
            onClick={() => setSelectedDifficulty('EASY')}
            className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-semibold ${selectedDifficulty === 'EASY' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
          >
            Easy
          </button>
          <button
            type="button"
            onClick={() => setSelectedDifficulty('MEDIUM')}
            className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-semibold ${selectedDifficulty === 'MEDIUM' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
          >
            Medium
          </button>
          <button
            type="button"
            onClick={() => setSelectedDifficulty('HARD')}
            className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-semibold ${selectedDifficulty === 'HARD' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
          >
            Hard
          </button>
        </div>
      </div>

      {loading && <LoadingSkeleton count={3} />}
      {error && <ErrorState message={error} />}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState title="No Questions Found" description="Try broadening your search term or filtering." />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map((q) => (
            <article
              key={q.id}
              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
                <div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    {q.companyName} • {q.roleTitle}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      #{q.topic}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${q.difficulty === 'HARD' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'}`}
                    >
                      {q.difficulty}
                    </span>
                    <span className="text-[11px] text-slate-400">• Asked {q.frequencyCount} times</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleHelpful(q.id)}
                  className="min-h-[44px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
                >
                  👍 Helpful ({q.helpfulCount})
                </button>
              </div>

              <Link href={`/placements/questions/${q.id}`} className="group">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">
                  "{q.questionText}"
                </p>
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
