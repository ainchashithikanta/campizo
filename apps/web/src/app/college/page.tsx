'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { COLLEGES, College } from '../../lib/colleges';

export const dynamic = 'force-dynamic';

const COLLEGE_KEY = 'ch_college_id';

function CollegeSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(COLLEGE_KEY);
    if (stored) {
      const college = COLLEGES.find((c) => c.id === stored);
      if (college) setSelectedCollege(college);
    }
  }, []);

  const handleSelect = (college: College) => {
    setSelectedCollege(college);
    localStorage.setItem(COLLEGE_KEY, college.id);
    document.cookie = `ch_college_id=${college.id}; path=/; max-age=31536000; SameSite=Lax`;
    const url = `${next}?college=${college.id}`;
    router.push(url);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 mb-3">
            Choose Your College
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Select your institution to sign in with your official {COLLEGES[0].emailDomain.split('.').slice(-2).join('.')} email address
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" role="list" aria-label="Available colleges">
          {COLLEGES.map((college) => (
            <article
              key={college.id}
              className={`relative group rounded-2xl border-2 p-6 bg-white dark:bg-slate-900 transition-all hover:border-indigo-400 hover:shadow-xl ${
                selectedCollege?.id === college.id
                  ? 'ring-4 ring-indigo-500/30 border-indigo-500'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
              role="listitem"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl" aria-hidden="true">{college.logo}</span>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {college.shortName}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {college.description}
                  </p>
                </div>
              </div>

              <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Required email domain
                </p>
                <code className="text-sm font-mono font-medium text-slate-900 dark:text-slate-100">
                  @{college.emailDomain}
                </code>
              </div>

              <button
                onClick={() => handleSelect(college)}
                className={`w-full py-3 rounded-xl font-semibold text-base transition-colors ${
                  selectedCollege?.id === college.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {selectedCollege?.id === college.id ? 'Selected ��' : 'Choose this college'}
              </button>

              {selectedCollege?.id === college.id && (
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-sm font-bold">
                  ��
                </div>
              )}
            </article>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Only your college&apos;s official .edu email address will be accepted for sign-up and sign-in.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function CollegeSelectionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent" /></div>}>
      <CollegeSelectionContent />
    </Suspense>
  );
}