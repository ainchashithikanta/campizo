'use client';

import React from 'react';
import Link from 'next/link';
import '../../../styles/confessions.css';
import { NotificationCard } from '../../../components/confessions/ConfessionComponents';

export default function NotificationsPage() {
  const mockNotifications = [
    {
      id: 'notif-1',
      title: 'Reply Received',
      body: 'Witty Owl #108 replied to your confession thread in CASIO FX-991ES+ Usage.',
      date: '10 mins ago'
    },
    {
      id: 'notif-2',
      title: 'Confession Trending',
      body: 'Your confession in Hostel 4 Cat is currently #1 trending on campus!',
      date: '1 hour ago'
    }
  ];

  return (
    <div className="conf-container">
      <header className="conf-header">
        <Link href="/confessions" className="conf-action-btn">
          ← Back to Feed
        </Link>
        <h1 className="conf-title">🔔 Notifications</h1>
      </header>

      {mockNotifications.map((n) => (
        <NotificationCard key={n.id} title={n.title} body={n.body} date={n.date} />
      ))}
    </div>
  );
}
