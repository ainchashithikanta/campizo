/**
 * Campus Connect — Conversation List & Message Bubble Components
 * Context-aware messaging components displaying originating context banners and read receipts.
 */

import React from 'react';
import type { ConversationItem, MessageItem } from '../../lib/api-campus-connect';

export function ConversationList({ conversations, activeId, onSelect }: { conversations: ConversationItem[]; activeId?: string; onSelect: (id: string) => void }) {
  if (!conversations || conversations.length === 0) {
    return <p className="text-xs text-slate-500 p-4">No active conversations.</p>;
  }

  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800" role="list">
      {conversations.map((c) => {
        const isActive = c.id === activeId;
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              className={`w-full text-left p-4 min-h-[48px] flex flex-col gap-1 transition-colors ${
                isActive ? 'bg-indigo-500/10 border-l-4 border-indigo-600' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{c.title || `Conversation ${c.id.slice(0, 8)}`}</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {c.contextType}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">Context ID: {c.contextId}</p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function MessageBubble({ message, isOwn }: { message: MessageItem; isOwn: boolean }) {
  return (
    <div className={`flex flex-col mb-3 ${isOwn ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[75%] p-3.5 rounded-2xl text-sm ${
          isOwn
            ? 'bg-indigo-600 text-white rounded-br-none'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-none'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
      <span className="text-[10px] text-slate-400 mt-1 px-1">
        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        {message.isRead && <span className="ml-1 text-emerald-500 font-semibold">✓✓</span>}
      </span>
    </div>
  );
}
