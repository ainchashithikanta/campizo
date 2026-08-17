'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import { getCollegeById, College } from '@/lib/colleges';
import { COLLEGE_KEY } from '@/lib/auth';
import '@web/styles/auth-clerk.css';

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
      router.push('/college?next=/sign-in');
      return;
    }

    if (isSignedIn && user) {
      const email = user.primaryEmailAddress?.emailAddress;
      if (email && college) {
        const domain = email.split('@')[1]?.toLowerCase();
        const allowed = domain === college.emailDomain;
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
    await signOut({ redirectUrl: `/college?next=/sign-in` });
  };

  if (checking) {
    return (
      <main className="ck-auth-page">
        <div className="ck-auth-wrap">
          <div className="ck-auth-empty">
            <span className="ck-auth-empty-emoji" aria-hidden="true">🔍</span>
            <h2>Verifying your college email...</h2>
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
            <h2>No college selected</h2>
            <p>Please select your institution to continue.</p>
            <a href="/college?next=/sign-in" className="ck-btn">
              Choose College →
            </a>
          </div>
        </div>
      </main>
    );
  }

  if (domainMismatch) {
    return (
      <main className="ck-auth-page">
        <div className="ck-auth-wrap">
          <div className="ck-auth-empty">
            <span className="ck-auth-empty-emoji" aria-hidden="true">⚠️</span>
            <h2>Email domain mismatch</h2>
            <p>
              Your account uses <code className="cl-college-domain-code">
                @{user?.primaryEmailAddress?.emailAddress.split('@')[1] ?? 'unknown'}
              </code>, but <strong>{college.shortName}</strong> requires{' '}
              <code className="cl-college-domain-code">@{college.emailDomain}</code>.
            </p>
            <div className="space-y-3">
              <button onClick={handleSignOutAndRetry} className="cl-btn" style={{ width: '100%', background: 'linear-gradient(90deg, var(--toon-coral), #ff8f8f)', color: '#fff' }}>
                Sign out and choose correct college
              </button>
              <a href="/college?next=/sign-in" className="ck-btn" style={{ width: '100%', justifyContent: 'center' }}>
                Change college selection
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="ck-auth-page">
      <div className="ck-auth-wrap">
        <header className="ck-auth-hero">
          <div className="ck-auth-logo" aria-hidden="true">✅</div>
          <p className="ck-auth-kicker">All set!</p>
          <h1 className="ck-auth-title">
            College <span>verified!</span>
          </h1>
          <p className="ck-auth-sub">
            Welcome to <strong>{college.shortName}</strong>. Your email domain matches the selected college.
          </p>
          <a href="/" className="ck-btn">
            Continue to Campizo →
          </a>
        </header>
      </div>
    </main>
  );
}