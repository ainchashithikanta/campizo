'use client';

import React, { useEffect, useState } from 'react';
import { SignUp } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCollegeById, College } from '@/lib/colleges';
import { COLLEGE_KEY } from '@/lib/auth';
import '@web/styles/auth-clerk.css';

export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [college, setCollege] = useState<College | null>(null);
  const [showDomainError, setShowDomainError] = useState(false);

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

  const handleSignUpComplete = () => {
    if (college) {
      router.push('/college-verified');
    } else {
      router.push('/');
    }
  };

  if (!college) {
    return (
      <main className="ck-auth-page">
        <div className="ck-auth-wrap">
          <div className="ck-auth-empty">
            <span className="ck-auth-empty-emoji" aria-hidden="true">🎓</span>
            <h2>Select your college first</h2>
            <p>Please choose your institution before signing up.</p>
            <a href="/college?next=sign-up" className="ck-btn">
              Choose College →
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="ck-auth-page">
      <div className="ck-auth-wrap">
        <header className="ck-auth-hero">
          <div className="ck-auth-logo" aria-hidden="true">{college.logo}</div>
          <p className="ck-auth-kicker">Join your campus hub</p>
          <h1 className="ck-auth-title">
            Create your <span>{college.shortName}</span> account
          </h1>
          <p className="ck-auth-sub">
            One account for confessions, study materials, marketplace, connect &amp; placements.
          </p>
          <span className="ck-auth-chip">
            🔒 Official email required <code>@{college.emailDomain}</code>
          </span>
        </header>

        <div className="ck-auth-card">
          <SignUp
            appearance={{
              variables: {
                colorPrimary: '#7c5cff',
                borderRadius: '12px'
              }
            }}
            forceRedirectUrl="/college-verified"
            signInUrl={`/sign-in?college=${college.id}`}
          />

          {showDomainError && college && (
            <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm">
              Please use your {college.shortName} email (@{college.emailDomain}) to sign up.
            </div>
          )}
        </div>

        <div className="ck-auth-stats">
          <div className="ck-auth-stat">
            <span className="ck-auth-stat-value">4.5k+</span>
            <span className="ck-auth-stat-label">student posts</span>
          </div>
          <div className="ck-auth-stat">
            <span className="ck-auth-stat-value">1.8k</span>
            <span className="ck-auth-stat-label">study resources</span>
          </div>
          <div className="ck-auth-stat">
            <span className="ck-auth-stat-value">100%</span>
            <span className="ck-auth-stat-label">anonymous &amp; safe</span>
          </div>
        </div>
      </div>
    </main>
  );
}