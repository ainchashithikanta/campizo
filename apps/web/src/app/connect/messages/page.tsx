/**
 * Campus Connect — Messages List Page
 * Route: /connect/messages
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ConversationList } from '../../../components/connect/messaging-components';
import { LoadingSkeleton, EmptyState } from '../../../components/connect/state-components';
import { type ConversationItem } from '../../../lib/api-campus-connect';

export default function MessagesListPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock or fetch active conversations
    setTimeout(() => {
      setConversations([
        {
          id: 'conv_cs224n',
          conversationType: 'STUDY_GROUP',
          contextType: 'STUDY_POD',
          contextId: 'pod_cs224n',
          title: 'CS224N Midterm Study Pod',
          participantIds: ['usr_me', 'usr_sarah']
        },
        {
          id: 'conv_treehacks',
          conversationType: 'PROJECT_TEAM',
          contextType: 'HACKATHON_PROJECT',
          contextId: 'proj_ai_assistant',
          title: 'TreeHacks AI Dev Team',
          participantIds: ['usr_me', 'usr_alex']
        }
      ]);
      setLoading(false);
    }, 100);
  }, []);

  const handleSelect = (id: string) => {
    router.push(`/connect/messages/${id}`);
  };

  return (
    <main className="max-w-4xl mx-auto p-6 font-sans">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Messages & Pod Chats</h1>
        <p className="text-xs text-slate-500 mt-1">
          Contextual study pod and team messaging with origin context banners.
        </p>
      </header>

      {loading && <LoadingSkeleton count={2} />}

      {!loading && conversations.length === 0 && (
        <EmptyState
          title="No Active Messages"
          description="You have no active conversations. Connect with peers or join a study pod to start chatting!"
        />
      )}

      {!loading && conversations.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          <ConversationList conversations={conversations} onSelect={handleSelect} />
        </div>
      )}
    </main>
  );
}
