/**
 * Unified Notification Engine — Next.js Frontend UI Component Tests (MS-40 Production)
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  UnreadBadge,
  NotificationBell,
  NotificationItemCard
} from '../components/notifications/notification-components';
import NotificationHistoryPage from '../app/notifications/page';
import NotificationPreferencesPage from '../app/notifications/preferences/page';
import NotificationDigestsPage from '../app/notifications/digests/page';

describe('Unified Notification Engine Frontend UI Suite (MS-40 Production)', () => {
  const mockNotif = {
    id: 'notif_1',
    collegeId: 'college_stanford_001',
    recipientId: 'usr_me',
    actorId: 'usr_buyer_99',
    eventType: 'MARKETPLACE_ITEM_SOLD',
    category: 'MARKETPLACE' as const,
    aggregationCount: 1,
    title: 'Item Sold!',
    message: 'Calculus textbook was sold.',
    metadata: {},
    link: '/marketplace/1',
    priority: 'HIGH' as const,
    isRead: false,
    createdAt: new Date().toISOString()
  };

  it('1. should render UnreadBadge when count is positive', () => {
    render(<UnreadBadge count={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('2. should render NotificationBell with bell icon', () => {
    render(<NotificationBell />);
    expect(screen.getByRole('button', { name: /Notifications bell/i })).toBeInTheDocument();
  });

  it('3. should render NotificationItemCard with title and message', () => {
    render(<NotificationItemCard notification={mockNotif} />);
    expect(screen.getByText('Item Sold!')).toBeInTheDocument();
    expect(screen.getByText('Calculus textbook was sold.')).toBeInTheDocument();
  });

  it('4. should render NotificationHistoryPage header and folder category tabs', () => {
    render(<NotificationHistoryPage />);
    expect(screen.getByText(/Notifications Inbox/i)).toBeInTheDocument();
    expect(screen.getByText(/🏷️ Marketplace/i)).toBeInTheDocument();
  });

  it('5. should render NotificationPreferencesPage rules and quiet hours title', () => {
    render(<NotificationPreferencesPage />);
    expect(screen.getByText(/Notification Preferences & Rules/i)).toBeInTheDocument();
  });

  it('6. should render NotificationDigestsPage header', () => {
    render(<NotificationDigestsPage />);
    expect(screen.getByText(/Notification Digests/i)).toBeInTheDocument();
  });
});
