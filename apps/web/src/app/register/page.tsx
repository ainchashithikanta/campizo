'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { register as apiRegister, type Gender } from '@web/lib/auth';
import '@web/styles/auth.css';

function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<Gender>('MALE');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await apiRegister({ email, password, fullName, gender });
      router.push('/connect/random');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Unable to create account');
      setLoading(false);
    }
  };

  const valid = fullName.length >= 2 && email.length > 0 && password.length >= 8;

  return (
    <div className="ch-auth-page">
      <div className="ch-auth-card">
        <Link href="/" className="ch-auth-back">
          ← Back to Campizo
        </Link>
        <div className="ch-auth-logo">CZ</div>
        <h1 className="ch-auth-title">Create Your Student Profile</h1>
        <p className="ch-auth-subtitle">
          Gender is required so we can match you with the opposite gender in anonymous random chat.
        </p>

        <form onSubmit={handleSubmit} className="ch-auth-form">
          <label htmlFor="auth-fullName">Full Name</label>
          <input
            id="auth-fullName"
            className="ch-auth-input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Doe"
            required
            minLength={2}
          />
          <label htmlFor="auth-email">College Email</label>
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
            placeholder="Min 8 characters"
            autoComplete="new-password"
            required
            minLength={8}
          />
          <label htmlFor="auth-gender">Gender</label>
          <select
            id="auth-gender"
            className="ch-auth-input"
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender)}
          >
            <option value="FEMALE">Female</option>
            <option value="MALE">Male</option>
          </select>
          {error && (
            <p className="ch-auth-error" role="alert">
              ⛔ {error}
            </p>
          )}
          <button type="submit" className="ch-auth-btn" disabled={loading || !valid}>
            {loading ? 'Creating account…' : 'Create Account & Start Chatting'}
          </button>
        </form>

        <p className="ch-auth-footer">
          Already have an account?{' '}
          <Link href="/login" className="ch-auth-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
