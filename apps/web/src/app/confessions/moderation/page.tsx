'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ModerationQueuePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/moderation/confessions');
  }, [router]);

  return <div style={{ padding: '2rem', textAlign: 'center' }}>Redirecting to the Admin Moderation Center…</div>;
}
