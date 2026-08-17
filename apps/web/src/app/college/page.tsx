'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { COLLEGES, College } from '../../lib/colleges';
import { sanitizeInternalPath } from '../../lib/safe-redirect';
import '@web/styles/auth-clerk.css';

export const dynamic = 'force-dynamic';

const COLLEGE_KEY = 'ch_college_id';

function CollegeSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get('next');
  const next = sanitizeInternalPath(rawNext ? (rawNext.startsWith('/') ? rawNext : `/${rawNext}`) : null, '/');
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
    document.cookie = `ch_college_id=${college.id}; path=/; max-age=31536000; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
    const url = `${next}?college=${college.id}`;
    router.push(url);
  };

  return (
    <main className="ck-auth-page">
      <div className="ck-auth-wrap">
        <header className="ck-auth-hero">
          <div className="ck-auth-logo" aria-hidden="true">🏫</div>
          <p className="ck-auth-kicker">Campizo · Choose your campus</p>
          <h1 className="ck-auth-title">
            Select your <span>college</span>
          </h1>
          <p className="ck-auth-sub">
            Pick your institution to continue. Only your college&apos;s official email domain will be accepted for
            sign-up and sign-in.
          </p>
        </header>

        <div className="cl-college-list" role="list" aria-label="Available colleges">
          {COLLEGES.map((college) => (
            <article
              key={college.id}
              className={`cl-college-card ${selectedCollege?.id === college.id ? 'cl-college-card-selected' : ''}`}
              role="listitem"
            >
              <div className="cl-college-head">
                <span className="cl-college-emoji" aria-hidden="true">{college.logo}</span>
                <div className="cl-college-id">
                  <h3 className="cl-college-name">{college.shortName}</h3>
                  <p className="cl-college-desc">{college.description}</p>
                </div>
              </div>

              <div className="cl-college-domain">
                <span className="cl-college-domain-label">Required email domain</span>
                <code className="cl-college-domain-code">@{college.emailDomain}</code>
              </div>

              <button onClick={() => handleSelect(college)} className={`cl-btn ${selectedCollege?.id === college.id ? 'cl-btn-selected' : ''}`}>
                {selectedCollege?.id === college.id ? '✓ Selected — Continue' : 'Choose this college'}
              </button>
            </article>
          ))}
        </div>

        <p className="cl-footnote">
          🔒 Only your college&apos;s official <code>@nitk.edu.in</code> email address will be accepted.
        </p>
      </div>
    </main>
  );
}

export default function CollegeSelectionPage() {
  return (
    <Suspense
      fallback={
        <main className="ck-auth-page">
          <div className="ck-auth-wrap">
            <div className="ck-auth-empty">
              <span className="ck-auth-empty-emoji" aria-hidden="true">🏫</span>
              <h2>Loading colleges...</h2>
            </div>
          </div>
        </main>
      }
    >
      <CollegeSelectionContent />
    </Suspense>
  );
}