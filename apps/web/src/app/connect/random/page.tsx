/**
 * Campus Connect — Random Anonymous Chat
 * Route: /connect/random
 * Omegle-style chat between opposite-gender students, end-to-end encrypted
 * (AES-256-GCM client-side), auto-closes after a TTL and when either side leaves.
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  joinRandomChat,
  fetchRandomChatStatus,
  leaveRandomChat,
  sendEncryptedMessage,
  type RandomChatStatus
} from '@web/lib/api-campus-connect';
import { encryptMessage, decryptMessage, type ChatCryptoKey } from '@web/lib/chat-crypto';
import { useAuth } from '@web/components/auth/AuthContext';
import '@web/styles/rate-my-professor.css';

type ChatMessage = {
  id: string;
  sender: 'me' | 'peer';
  text: string;
  createdAt: string;
};

export default function RandomChatPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [status, setStatus] = useState<RandomChatStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState<ChatCryptoKey | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [countdown, setCountdown] = useState<number>(0);

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const nowRef = useRef<number>(0);

  const startFresh = () => {
    setStatus(null);
    setKey(null);
    setConversationId(null);
    setMessages([]);
    setDraft('');
    setError(null);
  };

  const join = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await joinRandomChat();
      setStatus(result);
      if (result.status === 'MATCHED' && result.conversationKey && result.conversationId) {
        setKey(result.conversationKey);
        setConversationId(result.conversationId);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to join chat');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const result = await fetchRandomChatStatus();
      setStatus(result);
      if (result.status === 'MATCHED' && result.conversationKey && !key && result.conversationId) {
        setKey(result.conversationKey);
        setConversationId(result.conversationId);
      }
      if (result.status === 'CLOSED' || result.status === 'IDLE') {
        setKey(null);
        setConversationId(result.conversationId ?? null);
      }
    } catch {
      // ignore transient errors during polling
    }
  };

  const leave = async () => {
    try {
      const result = await leaveRandomChat();
      setStatus(result);
      setKey(null);
      setConversationId(null);
      setMessages([]);
    } catch (err: any) {
      setError(err?.message || 'Could not leave chat');
    }
  };

  const sendMessage = async (text: string) => {
    if (!conversationId || !key) return;
    const { ciphertext, iv } = await encryptMessage(text, key);
    try {
      const saved = await sendEncryptedMessage({ conversationId, ciphertext, iv });
      if (saved.ciphertext && saved.iv) {
        const decrypted = await decryptMessage(saved.ciphertext, saved.iv, key);
        setMessages((m) => [
          ...m,
          { id: saved.id, sender: 'me', text: decrypted, createdAt: new Date().toISOString() }
        ]);
        setDraft('');
      }
    } catch (err: any) {
      setError(err?.message || 'Message not sent');
    }
  };

  // Redirect to login when not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?from=/connect/random');
    }
  }, [authLoading, user, router]);

  // Auto-poll while waiting or matched
  useEffect(() => {
    if (!user) return;

    const isActive = status?.status === 'WAITING' || status?.status === 'MATCHED';
    if (isActive) {
      fetchStatus();
      pollRef.current = setInterval(fetchStatus, 2500);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.status, user]);

  // Countdown timer from expiresAt
  useEffect(() => {
    if (!status?.expiresAt) {
      setCountdown(0);
      return;
    }
    const target = new Date(status.expiresAt).getTime();
    const tick = () => {
      nowRef.current = (target - Date.now()) / 1000;
      setCountdown(nowRef.current);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status?.expiresAt]);

  if (authLoading) {
    return <div className="rmp-section">Loading…</div>;
  }

  if (!user) {
    return null;
  }

  // Waiting for a match
  if (!status || status.status === 'WAITING') {
    return (
      <main className="rmp-section container mx-auto max-w-3xl rmp-fade-in">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Random Chat</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Anonymous end-to-end encrypted chat. Matched only with the opposite gender.
          </p>
        </header>

        {!status && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Anonymous. Encrypted. Opposite-gender only.
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
              You’ll be paired with another student for a timed, end-to-end encrypted conversation. The chat closes
              automatically after it ends and if either person leaves.
            </p>
            {error && <p className="text-sm text-rose-600 mb-4">⚠ {error}</p>}
            <button
              onClick={join}
              disabled={loading}
              className="min-h-[48px] px-6 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              {loading ? 'Looking for a match…' : 'Start Chat'}
            </button>
          </div>
        )}

        {status && status.status === 'WAITING' && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4 animate-pulse">👀</div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Looking for a match…</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              You’re in the queue. This usually takes a moment — feel free to wait, or come back later.
            </p>
            <button
              onClick={leave}
              className="min-h-[44px] px-5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
            >
              Leave Queue
            </button>
          </div>
        )}
      </main>
    );
  }

  // Closed / ended
  if (status?.status === 'CLOSED') {
    const reasonLabel = status.reason === 'TIMEOUT' ? 'timed out' : status.reason === 'LEFT' ? 'ended' : 'ended';
    return (
      <main className="rmp-section container mx-auto max-w-3xl rmp-fade-in">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Random Chat</h1>
        </header>
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Chat {reasonLabel}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            {status.reason === 'LEFT'
              ? 'The other person left the chat. The conversation is now closed.'
              : 'The chat reached its time limit and ended automatically.'}
          </p>
          <button
            onClick={startFresh}
            className="min-h-[48px] px-6 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            Start a New Chat
          </button>
        </div>
      </main>
    );
  }

  // Active chat
  return (
    <main className="rmp-section container mx-auto max-w-3xl rmp-fade-in flex flex-col">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Random Chat</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Matched with a{' '}
            {status?.peerGender === 'MALE' ? '♂️ Male' : status?.peerGender === 'FEMALE' ? '♀️ Female' : 'peer'} •
            End-to-end encrypted
          </p>
        </div>
        <div className="text-right text-sm">
          <span className="font-mono text-indigo-600 dark:text-indigo-400">
            ⏱ {Math.max(0, Math.floor(countdown))}s left
          </span>
          <button
            onClick={leave}
            className="ml-3 text-xs font-semibold text-rose-600 hover:text-rose-700"
            title="Leave this chat (closes it for both sides)"
          >
            Leave
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 p-4 mb-3 min-h-[320px]">
        {messages.length === 0 ? (
          <p className="text-center text-slate-400 dark:text-slate-500 py-10">
            🔒 Messages are encrypted and only readable by you and your match.
          </p>
        ) : (
          <ul className="space-y-2">
            {messages.map((m) => (
              <li
                key={m.id}
                className={
                  m.sender === 'me'
                    ? 'ml-auto max-w-[70%] rounded-2xl bg-indigo-600 text-white px-3 py-2'
                    : 'mr-auto max-w-[70%] rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2'
                }
              >
                <p className="text-sm break-words">{m.text}</p>
                <span className="text-[10px] opacity-70 block text-right">
                  {new Date(m.createdAt).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) void sendMessage(draft.trim());
        }}
        className="flex gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message… (encrypted before sending)"
          className="flex-1 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={!draft.trim() || !conversationId || !key}
          className="min-h-[44px] px-4 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
          title="Send encrypted message"
        >
          ➤
        </button>
      </form>
      {error && <p className="text-xs text-rose-600 mt-2">⚠ {error}</p>}
    </main>
  );
}
