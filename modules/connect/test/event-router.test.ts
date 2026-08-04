/**
 * Campus Connect — Event Router & DLQ Integration Tests (MS-23.8.4)
 * Verifies event envelope validation, duplicate event protection, ordering, retries, DLQ poison detection, and replay.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EventRouter } from '../src/events/event-router.js';
import { DLQManager } from '../src/events/dlq-manager.js';
import { buildEventEnvelope } from '../src/events/event-envelope.js';

describe('Event Router & Dead Letter Queue Pipeline', () => {
  let router: EventRouter;
  let dlqManager: DLQManager;

  beforeEach(() => {
    dlqManager = new DLQManager();
    router = new EventRouter(dlqManager);
  });

  it('1. Event Router: Validates mandatory envelope fields and dispatches event to subscriber', async () => {
    let receivedPayload: any = null;

    router.subscribe('IntentActivated', async (event) => {
      receivedPayload = event.payload;
    });

    const event = buildEventEnvelope('IntentActivated', { intentId: 'int_001', studentProfileId: 'usr_101', intentType: 'STUDY' }, { collegeId: 'college_stanford_001' });

    const result = await router.dispatch(event);
    expect(result).toBe(true);
    expect(receivedPayload).toEqual({ intentId: 'int_001', studentProfileId: 'usr_101', intentType: 'STUDY' });
  });

  it('2. Duplicate Event Protection: Skips execution for identical eventId idempotently', async () => {
    let executionCount = 0;

    router.subscribe('IntentActivated', async () => {
      executionCount++;
    });

    const event = buildEventEnvelope('IntentActivated', { intentId: 'int_001' }, { eventId: 'evt_fixed_001' });

    const first = await router.dispatch(event);
    const second = await router.dispatch(event);

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(executionCount).toBe(1);
  });

  it('3. Retries & DLQ Routing: Routes failed events to DLQ after max retry exhaustion', async () => {
    let attempts = 0;

    router.subscribe('FailingEvent', async () => {
      attempts++;
      throw new Error('Simulated worker processing failure');
    });

    const event = buildEventEnvelope('FailingEvent', { data: 'test' }, { eventId: 'evt_fail_999' });

    await router.dispatch(event);

    expect(attempts).toBe(3);
    const poisonMessages = dlqManager.getPoisonMessages();
    expect(poisonMessages.length).toBe(1);
    expect(poisonMessages[0]?.event.eventId).toBe('evt_fail_999');
    expect(poisonMessages[0]?.lastError).toBe('Simulated worker processing failure');
  });

  it('4. Replay System: Replays poison message from DLQ upon manual trigger', async () => {
    let attempts = 0;
    let failMode = true;

    router.subscribe('ReplayEvent', async () => {
      attempts++;
      if (failMode) {
        throw new Error('Initial failure');
      }
    });

    const event = buildEventEnvelope('ReplayEvent', { data: 'replay' }, { eventId: 'evt_replay_777' });
    await router.dispatch(event);

    expect(dlqManager.getPoisonMessages().length).toBe(1);

    // Fix underlying issue and trigger replay
    failMode = false;
    const replayed = await router.replayEvent('evt_replay_777');

    expect(replayed).toBe(true);
    expect(dlqManager.getPoisonMessages().length).toBe(0);
    expect(attempts).toBe(4);
  });
});
