'use client';

import React, { useEffect, useState } from 'react';
import { SignIn } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCollegeById, College } from '@/lib/colleges';
import { COLLEGE_KEY } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [college, setCollege] = useState<College | null>(null);

  useEffect(() => {
    const collegeParam = searchParams.get('college');
    if (collegeParam) {
      const c = getCollegeById(collegeParam);
      if (c) {
        setCollege(c);
        localStorage.setItem(COLLEGE_KEY, c.id);
        document.cookie = `ch_college_id=${c.id}; path=/; max-age=31536000; SameSite=Lax`;
      }
    } else {
      const stored = localStorage.getItem(COLLEGE_KEY);
      if (stored) {
        const c = getCollegeById(stored);
        if (c) setCollege(c);
      }
    }
  }, [searchParams]);

  if (!college) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Select your college first
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Please choose your institution before signing in.
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

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="text-4xl" aria-hidden="true">{college.logo}</span>
          <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">
            Sign in to {college.shortName}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Use your official <code className="font-mono text-indigo-600 dark:text-indigo-400">@{college.emailDomain}</code> email
          </p>
        </div>

        <SignIn
          appearance={{
            elements: {
              formButtonPrimary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
              card: 'shadow-xl border border-slate-200 dark:border-slate-700',
            },
          }}
          forceRedirectUrl="/college-verified"
          signUpUrl={`/sign-up?college=${college.id}`}
        />
      </div>
    </div>
  );
}