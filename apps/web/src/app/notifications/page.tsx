/**
 * Unified Notification Engine — Notification History & Category Inbox Page (MS-40)
 * Route: /notifications
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { NotificationItemCard } from '../../components/notifications/notification-components';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../components/connect/state-components';
import { fetchNotifications, markAllNotificationsAsRead, type NotificationItem } from '../../lib/api-notifications';

export default function NotificationHistoryPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [filterRead, setFilterRead] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const categoryParam = activeCategory === 'ALL' || activeCategory === 'UNREAD' ? undefined : (activeCategory as any);
    const isReadParam = activeCategory === 'UNREAD' ? false : filterRead;

    fetchNotifications({ category: categoryParam, isRead: isReadParam })
      .then((res) => {
        setNotifications(res.items || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load notifications');
        setLoading(false);
      });
  }, [activeCategory, filterRead]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // Retain UI
    }
  };

  const categories = [
    { id: 'ALL', label: '🔔 All' },
    { id: 'UNREAD', label: '🔵 Unread' },
    { id: 'MARKETPLACE', label: '🏷️ Marketplace' },
    { id: 'PLACEMENT', label: '🎯 Placement & Q&A' },
    { id: 'ACADEMIC', label: '📚 Academic' },
    { id: 'SECURITY', label: '⚠️ Security' }
  ];

  return (
    <main className="max-w-4xl mx-auto p-6 font-sans">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">Notifications Inbox</h1>
          <p className="text-sm text-slate-500 mt-1">Platform-wide updates across Marketplace, Placements, Q&A, and Campus Connect.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/notifications/settings"
            className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
          >
            ⚙️ Preferences
          </Link>
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            ✓ Mark All as Read
          </button>
        </div>
      </header>

      {/* Category & Folder Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              setActiveCategory(cat.id);
              if (cat.id === 'UNREAD') setFilterRead(false);
              else if (cat.id === 'ALL') setFilterRead(undefined);
            }}
            className={`min-h-[44px] px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading && <LoadingSkeleton count={3} />}
      {error && <ErrorState message={error} />}

      {!loading && !error && notifications.length === 0 && (
        <EmptyState title="Inbox Clean" description="No notifications found in this folder." />
      )}

      {!loading && !error && notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map((n) => (
            <NotificationItemCard key={n.id} notification={n} />
          ))}
        </div>
      )}
    </main>
  );
}
