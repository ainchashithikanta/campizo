'use client';

import React, { useEffect, useState } from 'react';
import { SignIn, useUser, useClerk } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCollegeById, College } from '@/lib/colleges';
import { COLLEGE_KEY } from '@/lib/auth';
import '@web/styles/auth-clerk.css';

export const dynamic = 'force-dynamic';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const [college, setCollege] = useState<College | null>(null);

  useEffect(() => {
    const collegeParam = searchParams.get('college');
    if (collegeParam) {
      const c = getCollegeById(collegeParam);
      if (c) {
        setCollege(c);
        localStorage.setItem(COLLEGE_KEY, c.id);
        document.cookie = `ch_college_id=${c.id}; path=/; max-age=31536000; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
      }
    } else {
      const stored = localStorage.getItem(COLLEGE_KEY);
      if (stored) {
        const c = getCollegeById(stored);
        if (c) setCollege(c);
      }
    }
  }, [searchParams]);

  if (isLoaded && isSignedIn) {
    return (
      <main className="ck-auth-page">
        <div className="ck-auth-wrap">
          <div className="ck-auth-empty">
            <span className="ck-auth-empty-emoji" aria-hidden="true">👋</span>
            <h2>You&apos;re already signed in</h2>
            <p>
              Signed in as <strong>{user?.primaryEmailAddress?.emailAddress ?? 'a Campizo user'}</strong>. You can
              continue to your campus hub.
            </p>
            <div className="space-y-3">
              <a href="/college-verified" className="ck-btn" style={{ width: '100%', justifyContent: 'center' }}>
                Continue →
              </a>
              <button
                onClick={() => void signOut({ redirectUrl: `/college?next=/sign-in` })}
                className="cl-btn"
                style={{ width: '100%', background: 'linear-gradient(90deg, var(--toon-coral), #ff8f8f)', color: '#fff' }}
              >
                Sign out and use another account
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!college) {
    return (
      <main className="ck-auth-page">
        <div className="ck-auth-wrap">
          <div className="ck-auth-empty">
            <span className="ck-auth-empty-emoji" aria-hidden="true">🎓</span>
            <h2>Select your college first</h2>
            <p>Please choose your institution before signing in.</p>
            <a href="/college?next=/sign-in" className="ck-btn">
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
          <p className="ck-auth-kicker">Welcome back</p>
          <h1 className="ck-auth-title">
            Sign in to <span>{college.shortName}</span>
          </h1>
          <p className="ck-auth-sub">
            Continue where you left off — your campus is waiting for you.
          </p>
          <span className="ck-auth-chip">
            🔒 Official email required <code>@{college.emailDomain}</code>
          </span>
        </header>

        <div className="ck-auth-card">
          <SignIn
            appearance={{
              variables: {
                colorPrimary: '#7c5cff',
                borderRadius: '12px'
              }
            }}
            forceRedirectUrl="/college-verified"
            signUpUrl={`/sign-up?college=${college.id}`}
          />
        </div>

        <div className="ck-auth-stats">
          <div className="ck-auth-stat">
            <span className="ck-auth-stat-value">2.4k</span>
            <span className="ck-auth-stat-label">confessions this week</span>
          </div>
          <div className="ck-auth-stat">
            <span className="ck-auth-stat-value">320</span>
            <span className="ck-auth-stat-label">live listings</span>
          </div>
          <div className="ck-auth-stat">
            <span className="ck-auth-stat-value">40+</span>
            <span className="ck-auth-stat-label">companies hiring</span>
          </div>
        </div>
      </div>
    </main>
  );
}