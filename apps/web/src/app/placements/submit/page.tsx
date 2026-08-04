/**
 * Placement Guidance — Submit Experience Form Page
 * Route: /placements/submit
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitPlacementExperience } from '../../../lib/api-placement-guidance';

export default function SubmitExperiencePage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [jobType, setJobType] = useState<'INTERNSHIP' | 'FULL_TIME'>('FULL_TIME');
  const [branch, setBranch] = useState('Computer Science');
  const [cgpa, setCgpa] = useState(3.8);
  const [ctcOfferedLpa, setCtcOfferedLpa] = useState<number | undefined>(42.0);
  const [summary, setSummary] = useState('');
  const [preparationTips, setPreparationTips] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !roleTitle || !summary) return;

    setLoading(true);
    try {
      await submitPlacementExperience({
        companyName,
        roleTitle,
        jobType,
        branch,
        cgpa,
        ctcOfferedLpa,
        summary,
        preparationTips,
        isAnonymous,
        rounds: [
          {
            roundNumber: 1,
            roundName: 'Online Assessment & Coding',
            roundType: 'ONLINE_ASSESSMENT',
            durationMinutes: 90,
            description: 'Coding questions and MCQ aptitude.',
            topicsCovered: ['Data Structures', 'Algorithms']
          }
        ]
      });
      alert('Experience submitted successfully!');
      router.push('/placements');
    } catch (err: any) {
      alert(err.message || 'Failed to submit experience');
      setLoading(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-6 font-sans">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Share Placement & Interview Experience</h1>
        <p className="text-xs text-slate-500 mt-1">Help junior peers prepare by sharing your interview round questions and advice.</p>
      </header>

      <form onSubmit={handleSubmit} className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Google, Microsoft, Amazon"
              required
              className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Role Title</label>
            <input
              type="text"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="e.g. Software Engineer, Data Scientist"
              required
              className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Job Type</label>
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value as 'INTERNSHIP' | 'FULL_TIME')}
              className="w-full min-h-[48px] px-3 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="FULL_TIME">Full-Time</option>
              <option value="INTERNSHIP">Internship</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Branch / Degree</label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              required
              className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">CGPA Cutoff / Score</label>
            <input
              type="number"
              step="0.01"
              value={cgpa}
              onChange={(e) => setCgpa(Number(e.target.value))}
              required
              className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Offered Package (CTC in LPA)</label>
          <input
            type="number"
            step="0.5"
            value={ctcOfferedLpa || ''}
            onChange={(e) => setCtcOfferedLpa(e.target.value ? Number(e.target.value) : undefined)}
            placeholder="e.g. 45"
            className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Interview Summary & Overview</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Describe the interview process, round count, and general difficulty..."
            rows={4}
            required
            className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Preparation Advice & Resources</label>
          <textarea
            value={preparationTips}
            onChange={(e) => setPreparationTips(e.target.value)}
            placeholder="Share preparation strategies, book recommendations, or LeetCode topics..."
            rows={3}
            className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="anon"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="anon" className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Post Anonymously (Hide your student profile details)
          </label>
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="min-h-[48px] px-5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="min-h-[48px] px-6 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
          >
            {loading ? 'Publishing...' : 'Publish Experience'}
          </button>
        </div>
      </form>
    </main>
  );
}
