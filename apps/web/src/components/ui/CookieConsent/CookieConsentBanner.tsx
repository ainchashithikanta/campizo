'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import '@web/styles/cookie-consent.css';

const CONSENT_KEY = 'campizo_cookie_consent';

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(CONSENT_KEY)) {
      setVisible(true);
    }
  }, []);

  const handleChoice = (value: string) => {
    localStorage.setItem(CONSENT_KEY, value);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cc-banner" role="region" aria-label="Cookie consent">
      <div className="cc-content">
        <p className="cc-text">
          🍪 We use essential cookies for authentication, security and to remember your college selection.
          We never sell your data. See our <Link href="/privacy">Privacy Policy</Link> and{' '}
          <Link href="/terms">Terms of Service</Link>.
        </p>
        <div className="cc-actions">
          <button type="button" className="cc-btn cc-btn-primary" onClick={() => handleChoice('accepted')}>
            Accept all
          </button>
          <button type="button" className="cc-btn" onClick={() => handleChoice('necessary')}>
            Only necessary
          </button>
        </div>
      </div>
    </div>
  );
}