/**
 * Business / domain metrics facade (MS-55).
 * Counters for the platform's core business flows: authentication, marketplace,
 * notifications and placement guidance. Every counter is lazily created exactly
 * once on the shared registry.
 */

import type { MetricsRegistry } from './registry.js';

export interface BusinessMetrics {
  // Authentication (packages/security)
  loginSuccess(): void;
  loginFailure(): void;
  registrationSuccess(): void;
  registrationFailure(): void;

  // Marketplace (modules/marketplace)
  listingCreated(): void;
  listingPublished(): void;
  listingSold(): void;
  offerCreated(): void;
  offerAccepted(): void;
  purchaseSuccess(): void;
  purchaseFailed(): void;

  // Notifications (modules/notifications)
  notificationPublished(): void;
  notificationDropped(): void;
  notificationFailed(): void;
  notificationDelivered(durationMs: number): void;

  // Placement Guidance (modules/placement-guidance)
  placementQuery(kind?: 'company' | 'experience' | 'question'): void;
  interviewSubmitted(): void;
  interviewSubmissionFailed(): void;
}

export function createBusinessMetrics(registry: MetricsRegistry): BusinessMetrics {
  const authLogins = registry.counter('collegehub_auth_logins_total', 'Authentication login attempts by result', [
    'result'
  ]);
  const authRegistrations = registry.counter(
    'collegehub_auth_registrations_total',
    'Account registration attempts by result',
    ['result']
  );
  const listings = registry.counter('collegehub_marketplace_listings_total', 'Marketplace listing lifecycle events', [
    'action'
  ]);
  const offers = registry.counter('collegehub_marketplace_offers_total', 'Marketplace offer lifecycle events', [
    'action'
  ]);
  const purchases = registry.counter(
    'collegehub_marketplace_purchases_total',
    'Marketplace purchase (reservation completion) attempts by result',
    ['result']
  );
  const notifications = registry.counter(
    'collegehub_notifications_total',
    'Notification engine events (published, dropped, failed)',
    ['action']
  );
  const notificationDeliveryDuration = registry.histogram(
    'collegehub_notification_delivery_duration_seconds',
    'Notification delivery pipeline duration (create + enqueue)',
    { labelNames: [], buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5] }
  );
  const placementQueries = registry.counter(
    'collegehub_placement_queries_total',
    'Placement guidance queries answered',
    ['kind']
  );
  const interviewSubmissions = registry.counter(
    'collegehub_interview_submissions_total',
    'Interview experience submissions by result',
    ['result']
  );

  return {
    loginSuccess(): void {
      authLogins.inc({ result: 'success' });
    },
    loginFailure(): void {
      authLogins.inc({ result: 'failure' });
    },
    registrationSuccess(): void {
      authRegistrations.inc({ result: 'success' });
    },
    registrationFailure(): void {
      authRegistrations.inc({ result: 'failure' });
    },
    listingCreated(): void {
      listings.inc({ action: 'created' });
    },
    listingPublished(): void {
      listings.inc({ action: 'published' });
    },
    listingSold(): void {
      listings.inc({ action: 'sold' });
    },
    offerCreated(): void {
      offers.inc({ action: 'created' });
    },
    offerAccepted(): void {
      offers.inc({ action: 'accepted' });
    },
    purchaseSuccess(): void {
      purchases.inc({ result: 'success' });
    },
    purchaseFailed(): void {
      purchases.inc({ result: 'failure' });
    },
    notificationPublished(): void {
      notifications.inc({ action: 'published' });
    },
    notificationDropped(): void {
      notifications.inc({ action: 'dropped' });
    },
    notificationFailed(): void {
      notifications.inc({ action: 'failed' });
    },
    notificationDelivered(durationMs: number): void {
      notificationDeliveryDuration.observe({}, durationMs / 1000);
    },
    placementQuery(kind?: 'company' | 'experience' | 'question'): void {
      placementQueries.inc({ kind: kind ?? 'question' });
    },
    interviewSubmitted(): void {
      interviewSubmissions.inc({ result: 'success' });
    },
    interviewSubmissionFailed(): void {
      interviewSubmissions.inc({ result: 'failure' });
    }
  };
}
