/**
 * Unified Notification Engine — Unit & Integration Test Suite (MS-40 Production)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { InMemoryNotificationRepository } from '../src/infrastructure/repositories/in-memory-notification.repository.js';
import { GenericEventPublisher } from '../src/infrastructure/publishers/generic-event-publisher.js';
import { NotificationUseCases } from '../src/application/use-cases.js';
import { notificationRoutesPlugin } from '../src/presentation/routes.js';

describe('Unified Notification Engine Suite (MS-40 Production)', () => {
  let repo: InMemoryNotificationRepository;
  let publisher: GenericEventPublisher;
  let useCases: NotificationUseCases;

  beforeEach(() => {
    repo = new InMemoryNotificationRepository();
    publisher = new GenericEventPublisher(repo);
    useCases = new NotificationUseCases(repo, publisher);
  });

  it('1. Deduplication & Aggregation: Aggregates duplicate events ("John and 1 others liked your answer")', async () => {
    const notif1 = await useCases.publishNotification({
      collegeId: 'college_stanford_001',
      recipientId: 'usr_author_1',
      actorId: 'usr_john',
      actorName: 'John',
      eventType: 'QUESTION_HELPFUL',
      deduplicationKey: 'like_answer_ans_999',
      title: 'Helpful Vote',
      message: 'John liked your answer.'
    });

    expect(notif1.aggregationCount).toBe(1);

    const notif2 = await useCases.publishNotification({
      collegeId: 'college_stanford_001',
      recipientId: 'usr_author_1',
      actorId: 'usr_sarah',
      actorName: 'Sarah',
      eventType: 'QUESTION_HELPFUL',
      deduplicationKey: 'like_answer_ans_999',
      title: 'Helpful Vote',
      message: 'Sarah liked your answer.'
    });

    expect(notif2.id).toBe(notif1.id);
    expect(notif2.aggregationCount).toBe(2);
    expect(notif2.message).toContain('others liked your answer');
  });

  it('2. Category Mutes & Priority Overrides: Muted categories block normal events but allow URGENT security alerts', async () => {
    await useCases.updateUserRules({
      collegeId: 'college_stanford_001',
      userId: 'usr_rule_test',
      mutedCategories: ['MARKETPLACE']
    });

    // Muted event should be suppressed
    await publisher.publish({
      collegeId: 'college_stanford_001',
      recipientId: 'usr_rule_test',
      actorId: 'usr_buyer',
      eventType: 'MARKETPLACE_ITEM_SOLD',
      category: 'MARKETPLACE',
      title: 'Item Sold',
      message: 'Textbook sold',
      priority: 'NORMAL'
    });

    let count = await useCases.getUnreadCount('usr_rule_test', 'college_stanford_001');
    expect(count).toBe(0);

    // URGENT security alert must bypass mutes
    await publisher.publish({
      collegeId: 'college_stanford_001',
      recipientId: 'usr_rule_test',
      actorId: 'system',
      eventType: 'ACCOUNT_SECURITY_ALERT',
      category: 'SECURITY',
      title: 'Security Alert',
      message: 'Suspicious login detected.',
      priority: 'URGENT'
    });

    count = await useCases.getUnreadCount('usr_rule_test', 'college_stanford_001');
    expect(count).toBe(1);
  });

  it('3. Digest Generation: Bundles unread notifications into daily digest jobs', async () => {
    await useCases.publishNotification({
      collegeId: 'college_stanford_001',
      recipientId: 'usr_digest_user',
      actorId: 'usr_senior',
      eventType: 'NEW_DISCUSSION_REPLY',
      title: 'New Reply',
      message: 'Sarah answered your DP question.'
    });

    const digest = await useCases.generateDigest('college_stanford_001', 'usr_digest_user', 'DAILY');
    expect(digest.id).toBeDefined();
    expect(digest.itemsCount).toBe(1);
    expect(digest.status).toBe('GENERATED');

    const history = await useCases.getDigestJobs('usr_digest_user', 'college_stanford_001');
    expect(history.length).toBe(1);
  });

  it('4. REST API Integration: Exposes categories, rules, digests, and queue endpoints', async () => {
    const app = Fastify();
    await app.register(notificationRoutesPlugin, { useCases });

    try {
      const resCategories = await app.inject({
        method: 'GET',
        url: '/notifications/categories'
      });
      expect(resCategories.statusCode).toBe(200);
      const bodyCat = JSON.parse(resCategories.payload);
      expect(bodyCat.data.length).toBeGreaterThanOrEqual(5);

      const resDigest = await app.inject({
        method: 'POST',
        url: '/notifications/digests/generate',
        headers: {
          'x-college-id': 'college_stanford_001',
          'x-user-id': 'usr_me'
        },
        payload: { digestType: 'DAILY' }
      });
      expect(resDigest.statusCode).toBe(201);
    } finally {
      await app.close();
    }
  });
});
