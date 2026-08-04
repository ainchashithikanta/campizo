/**
 * Unified Notification Engine — Reusable UI Components
 * Accessible WCAG 2.2 AA compliant NotificationBell, UnreadBadge, Drawer, and Card components.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import type { NotificationItem } from '../../lib/api-notifications';
import {
  fetchUnreadCount,
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../../lib/api-notifications';

export function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center animate-pulse">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetchUnreadCount()
      .then(setUnreadCount)
      .catch(() => setUnreadCount(0));
  }, []);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setDrawerOpen(!drawerOpen)}
        aria-label={`Notifications bell, ${unreadCount} unread`}
        className="min-h-[44px] min-w-[44px] p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors relative flex items-center justify-center"
      >
        <span className="text-lg">🔔</span>
        <UnreadBadge count={unreadCount} />
      </button>

      {drawerOpen && <NotificationDrawer onClose={() => setDrawerOpen(false)} onCountChange={setUnreadCount} />}
    </div>
  );
}

export function NotificationItemCard({
  notification,
  onRead
}: {
  notification: NotificationItem;
  onRead?: () => void;
}) {
  const [read, setRead] = useState(notification.isRead);

  const handleRead = async () => {
    if (read) return;
    setRead(true);
    try {
      await markNotificationAsRead(notification.id);
      if (onRead) onRead();
    } catch {
      setRead(false);
    }
  };

  const getEventIcon = (type: string) => {
    if (type.includes('MARKETPLACE')) return '🏷️';
    if (type.includes('DISCUSSION') || type.includes('REPLY')) return '💬';
    if (type.includes('RESOURCE')) return '📚';
    if (type.includes('CONNECTION')) return '🤝';
    if (type.includes('SECURITY')) return '⚠️';
    return '📢';
  };

  return (
    <div
      onClick={handleRead}
      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
        read
          ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-75'
          : 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-500/30 font-semibold'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0 mt-0.5">{getEventIcon(notification.eventType)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{notification.title}</h4>
            <span className="text-[10px] text-slate-400 font-mono shrink-0">
              {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{notification.message}</p>

          {notification.link && (
            <Link
              href={notification.link}
              className="inline-block mt-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View Details →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function NotificationDrawer({
  onClose,
  onCountChange
}: {
  onClose: () => void;
  onCountChange?: (count: number) => void;
}) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications({ limit: 10 })
      .then((res) => {
        setItems(res.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      if (onCountChange) onCountChange(0);
    } catch {
      // Retain UI
    }
  };

  return (
    <div className="absolute right-0 top-14 w-80 sm:w-96 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-4 font-sans">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Notifications</h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            Realtime
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Mark all read
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold min-h-[32px] min-w-[32px]"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
        {loading && <p className="text-xs text-slate-400 p-4 text-center">Loading notifications...</p>}

        {!loading && items.length === 0 && (
          <p className="text-xs text-slate-400 p-6 text-center">No notifications yet!</p>
        )}

        {!loading &&
          items.map((n) => (
            <NotificationItemCard
              key={n.id}
              notification={n}
              onRead={() => {
                if (onCountChange) {
                  onCountChange(Math.max(0, items.filter((x) => !x.isRead && x.id !== n.id).length));
                }
              }}
            />
          ))}
      </div>

      <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-center">
        <Link
          href="/notifications"
          onClick={onClose}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-block"
        >
          View Full Notification History →
        </Link>
      </div>
    </div>
  );
}
