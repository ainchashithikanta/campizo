'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import { getCollegeById, COLLEGES, College, isEmailAllowedForCollege } from '@/lib/colleges';
import { COLLEGE_KEY } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default function CollegeVerifiedPage() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [college, setCollege] = useState<College | null>(null);
  const [checking, setChecking] = useState(true);
  const [domainMismatch, setDomainMismatch] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    const stored = localStorage.getItem(COLLEGE_KEY);
    if (stored) {
      const c = getCollegeById(stored);
      if (c) setCollege(c);
    }

    if (!isSignedIn) {
      router.push('/college?next=sign-in');
      return;
    }

    if (isSignedIn && user) {
      const email = user.primaryEmailAddress?.emailAddress;
      if (email && college) {
        const allowed = isEmailAllowedForCollege(email, college.id);
        if (!allowed) {
          setDomainMismatch(true);
        }
      } else if (!email) {
        setDomainMismatch(true);
      }
    }

    setChecking(false);
  }, [isLoaded, isSignedIn, user, router, college]);

  const handleSignOutAndRetry = async () => {
    await signOut({ redirectUrl: `/college?next=sign-in` });
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Verifying your college email...</p>
        </div>
      </div>
    );
  }

  if (!college) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            No college selected
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Please select your institution to continue.
          </p>
          <a
            href="/college?next=sign-in"
            className="inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Choose College
          </a>
        </div>
      </div>
    );
  }

  if (domainMismatch) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
            Email domain mismatch
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Your account uses <code className="font-mono text-rose-600 dark:text-rose-400">
              {user?.primaryEmailAddress?.emailAddress.split('@')[1] ?? 'unknown'}
            </code>, but you selected <strong>{college.shortName}</strong> which requires <code className="font-mono text-indigo-600 dark:text-indigo-400">@{college.emailDomain}</code>.
          </p>
          <div className="space-y-3">
            <button
              onClick={handleSignOutAndRetry}
              className="w-full py-3 rounded-xl font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors"
            >
              Sign out and choose correct college
            </button>
            <a
              href={`/college?next=sign-in`}
              className="inline-flex items-center justify-center w-full px-5 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Change college selection
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <span className="text-3xl">✅</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
          College verified!
          </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Welcome to <strong className="text-indigo-600 dark:text-indigo-400">{college.shortName}</strong>.
          Your email domain matches the selected college.
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center w-full px-5 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          Continue to Campizo
        </a>
      </div>
    </div>
  );
}