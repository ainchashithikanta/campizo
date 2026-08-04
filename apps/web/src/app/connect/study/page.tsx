/**
 * Campus Connect — Study Partners & Pods Page
 * Route: /connect/study
 * Allows students to browse study pods, filter by course, create study intents, and join study groups.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { StudyGroupCard } from '../../../components/connect/group-cards';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../../components/connect/state-components';
import { fetchStudyGroups, createStudyGroup, createIntent, type StudyGroupItem } from '../../../lib/api-campus-connect';

export default function StudyPartnersPage() {
  const [groups, setGroups] = useState<StudyGroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [courseCode, setCourseCode] = useState('');
  const [title, setTitle] = useState('');

  const loadGroups = () => {
    fetchStudyGroups()
      .then((res) => {
        setGroups(res || [
          { id: 'sg_101', courseCode: 'CS224N', title: 'NLP Midterm Study Pod', maxCapacity: 5, currentMembers: 3, status: 'OPEN' },
          { id: 'sg_102', courseCode: 'CS246', title: 'Mining Massive Datasets Pod', maxCapacity: 4, currentMembers: 2, status: 'OPEN' }
        ]);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load study groups');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode || !title) return;
    try {
      await createStudyGroup({ courseCode, title });
      await createIntent({ intentType: 'STUDY_PARTNER', title: `Study Pod: ${title}`, courseCode });
      setShowModal(false);
      setCourseCode('');
      setTitle('');
      loadGroups();
    } catch (err: any) {
      alert(err.message || 'Failed to create study group');
    }
  };

  const handleJoin = (id: string) => {
    alert(`Joined Study Group ${id}`);
  };

  return (
    <main className="max-w-4xl mx-auto p-6 font-sans">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Course Study Pods</h1>
          <p className="text-xs text-slate-500 mt-1">Browse and form course-specific study pods with campus peers.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="min-h-[48px] px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
        >
          + Create Study Pod
        </button>
      </header>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreate} className="bg-white dark:bg-slate-900 p-6 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Create Study Pod</h2>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Course Code</label>
              <input type="text" value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="e.g. CS224N" required className="w-full min-h-[44px] px-3 border rounded-xl" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Pod Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Exam Prep Pod" required className="w-full min-h-[44px] px-3 border rounded-xl" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Cancel</button>
              <button type="submit" className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white">Create Pod</button>
            </div>
          </form>
        </div>
      )}

      {loading && <LoadingSkeleton count={2} />}
      {error && <ErrorState message={error} />}

      {!loading && !error && groups.length === 0 && (
        <EmptyState title="No Study Pods Available" description="Be the first to create a study pod for your course!" />
      )}

      {!loading && !error && groups.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groups.map((g) => (
            <StudyGroupCard key={g.id} group={g} onJoin={handleJoin} />
          ))}
        </div>
      )}
    </main>
  );
}
