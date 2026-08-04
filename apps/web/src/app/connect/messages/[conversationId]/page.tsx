/**
 * Campus Connect — Conversation Detail Page
 * Route: /connect/messages/[conversationId]
 * Context Banner: EVERY CONVERSATION MUST DISPLAY ITS ORIGINATING CONTEXT.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { MessageBubble } from '../../../../components/connect/messaging-components';
import { LoadingSkeleton } from '../../../../components/connect/state-components';
import { sendMessage, type MessageItem, type ConversationItem } from '../../../../lib/api-campus-connect';

export default function ConversationDetailPage() {
  const params = useParams();
  const conversationId = String(params?.conversationId || 'conv_default');

  const [conversation, setConversation] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load mock conversation & messages
    setTimeout(() => {
      setConversation({
        id: conversationId,
        conversationType: 'STUDY_GROUP',
        contextType: 'STUDY_POD',
        contextId: 'pod_cs224n',
        title: 'CS224N Midterm Study Pod',
        participantIds: ['usr_me', 'usr_sarah']
      });

      setMessages([
        {
          id: 'msg_1',
          conversationId,
          senderProfileId: 'usr_sarah',
          content: 'Hey! Ready for the CS224N study session today?',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          isRead: true
        },
        {
          id: 'msg_2',
          conversationId,
          senderProfileId: 'usr_me',
          content: 'Yes! I finished the PyTorch transformer assignment.',
          createdAt: new Date(Date.now() - 1800000).toISOString(),
          isRead: true
        }
      ]);
      setLoading(false);
    }, 100);
  }, [conversationId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const newMsg: MessageItem = {
      id: `msg_${Date.now()}`,
      conversationId,
      senderProfileId: 'usr_me',
      content: text,
      createdAt: new Date().toISOString(),
      isRead: false
    };

    setMessages((prev) => [...prev, newMsg]);
    setText('');

    try {
      await sendMessage({ conversationId, content: text });
    } catch {
      // Optimistic update retained
    }
  };

  if (loading)
    return (
      <main className="max-w-4xl mx-auto p-6">
        <LoadingSkeleton count={3} />
      </main>
    );

  return (
    <main className="max-w-4xl mx-auto p-6 font-sans flex flex-col h-[calc(100vh-100px)]">
      {/* Context Banner */}
      <div className="p-4 rounded-2xl bg-indigo-900 text-white shadow-sm mb-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-800 text-indigo-200">
            Context: {conversation?.contextType}
          </span>
          <h1 className="text-lg font-bold mt-1">{conversation?.title}</h1>
          <p className="text-xs text-indigo-200">Context ID: {conversation?.contextId}</p>
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-4 shadow-inner">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} isOwn={m.senderProfileId === 'usr_me'} />
        ))}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type message to pod..."
          aria-label="Message text"
          className="flex-1 min-h-[48px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          className="min-h-[48px] px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors"
        >
          Send
        </button>
      </form>
    </main>
  );
}
