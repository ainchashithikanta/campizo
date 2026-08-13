'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../../../styles/confessions.css';
import { ConfessionsApiClient } from '../../../lib/api-confessions';
import { CreateWizard } from '../../../components/confessions/ConfessionComponents';

export default function CreateConfessionPage() {
  const router = useRouter();
  const COLLEGE = 'college-stanford-001';

  const handleSubmit = async (title: string, content: string, categoryCode: string, isAnonymous: boolean) => {
    const res = await ConfessionsApiClient.createConfession(COLLEGE, {
      title,
      content,
      categoryCode,
      isAnonymous
    });

    if (res.success) {
      router.push('/confessions');
    } else {
      alert(`Error creating confession: ${res.error?.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="conf-container">
      <header className="conf-header">
        <Link href="/confessions" className="conf-action-btn">
          ← Cancel
        </Link>
        <h1 className="conf-title">✍️ Confess</h1>
      </header>

      <CreateWizard onSubmit={handleSubmit} />
    </div>
  );
}
