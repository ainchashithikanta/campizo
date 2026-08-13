'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { login as apiLogin } from '@web/lib/auth';
import '@web/styles/auth.css';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/connect/random';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiLogin({ email, password });
      router.push(from);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password');
      setLoading(false);
    }
  };

  return (
    <div className="ch-auth-page">
      <div className="ch-auth-card">
        <Link href="/" className="ch-auth-back">
          ← Back to Campizo
        </Link>
        <div className="ch-auth-logo">CZ</div>
        <h1 className="ch-auth-title">Welcome Back</h1>
        <p className="ch-auth-subtitle">Sign in to start chatting on Campus Connect.</p>

        <form onSubmit={handleSubmit} className="ch-auth-form">
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            className="ch-auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.edu"
            autoComplete="email"
            required
          />
          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            className="ch-auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
            minLength={8}
          />
          {error && (
            <p className="ch-auth-error" role="alert">
              ⛔ {error}
            </p>
          )}
          <button
            type="submit"
            className="ch-auth-btn"
            disabled={loading || email.length === 0 || password.length === 0}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="ch-auth-footer">
          No account yet?{' '}
          <Link href="/register" className="ch-auth-link">
            Register your student profile
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
