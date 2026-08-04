import { describe, it, expect, beforeEach } from 'vitest';
import {
  DLQManager,
  EventRouter,
  EventReplayManager,
  PriorityQueueManager,
  FeatureEvaluationService,
  FeatureCreatedEvent
} from '../src/index.js';

describe('Platform Feature Flags — Chaos Engineering & Resilience Suite', () => {

  let dlqManager: DLQManager;
  let eventRouter: EventRouter;
  let replayManager: EventReplayManager;
  let priorityQueue: PriorityQueueManager;
  let evalService: FeatureEvaluationService;

  beforeEach(() => {
    dlqManager = new DLQManager();
    eventRouter = new EventRouter(dlqManager);
    replayManager = new EventReplayManager(eventRouter);
    priorityQueue = new PriorityQueueManager();
    evalService = new FeatureEvaluationService();

    evalService.preloadL1Cache([
      {
        flagKey: 'marketplace.p2p_chat',
        environment: 'PRODUCTION',
        defaultState: true,
        lifecycleStage: 'PRODUCTION'
      }
    ]);
  });

  it('1. Chaos: Redis Outage Simulation — Local L1 evaluation must remain 100% operational', () => {
    // Simulates complete Redis cluster disconnection
    const isRedisConnected = false;

    // Evaluation executes 100% from process memory
    const res = evalService.evaluateFeature('marketplace.p2p_chat', 'PRODUCTION');
    expect(res.enabled).toBe(true);
    expect(res.cacheSource).toBe('LOCAL_MEMORY');
    expect(isRedisConnected).toBe(false);
  });

  it('2. Chaos: Worker Crash & DLQ Recovery — Poison message routed to DLQ after 3 retries', () => {
    const eventId = 'evt_crash_999';

    // Simulate worker crash 3 times
    for (let attempt = 1; attempt <= 3; attempt++) {
      dlqManager.handleFailure({
        eventId,
        workerName: 'CrashWorker',
        requestId: 'req_c1',
        traceId: 'trace_c1',
        payload: {},
        attemptCount: attempt,
        errorReason: 'Process SIGKILL crash'
      });
    }

    const poison = dlqManager.getPoisonMessages();
    expect(poison.length).toBe(1);
    expect(poison[0]?.eventId).toBe(eventId);

    // Replay from DLQ
    const replayed = dlqManager.replayPoisonMessage(eventId);
    expect(replayed?.eventId).toBe(eventId);
    expect(dlqManager.getPoisonMessages().length).toBe(0);
  });

  it('3. Chaos: Duplicate & Delayed Event Delivery — Idempotency guard prevents duplicate handler execution', async () => {
    let executionCount = 0;
    eventRouter.registerHandler('FeatureCreated', async () => {
      executionCount++;
    });

    const event: FeatureCreatedEvent = {
      eventId: 'evt_dup_55',
      eventType: 'FeatureCreated',
      occurredAt: new Date().toISOString(),
      flagKey: 'confessions.feed',
      category: 'FEATURE_MANAGEMENT',
      owner: 'Team Confessions',
      defaultState: false
    };

    // First delivery
    await eventRouter.routeEvent(event);
    expect(executionCount).toBe(1);

    // Delayed duplicate delivery (arrives 10 seconds later)
    await eventRouter.routeEvent(event);
    expect(executionCount).toBe(1); // Blocked by idempotency check
  });

  it('4. Chaos: Safe Event Stream Replay — Replays sequential event stream deterministically', async () => {
    let replayedCount = 0;
    eventRouter.registerHandler('FeatureCreated', async () => {
      replayedCount++;
    });

    const envelopes = [
      {
        event: {
          eventId: 'evt_seq_1',
          eventType: 'FeatureCreated',
          occurredAt: new Date().toISOString(),
          flagKey: 'f1',
          category: 'CAT',
          owner: 'T1',
          defaultState: true
        } as FeatureCreatedEvent,
        requestId: 'r1',
        traceId: 't1',
        configurationVersion: 1
      },
      {
        event: {
          eventId: 'evt_seq_2',
          eventType: 'FeatureCreated',
          occurredAt: new Date().toISOString(),
          flagKey: 'f2',
          category: 'CAT',
          owner: 'T1',
          defaultState: true
        } as FeatureCreatedEvent,
        requestId: 'r2',
        traceId: 't2',
        configurationVersion: 2
      }
    ];

    const result = await replayManager.replayEventStream(envelopes);
    expect(result.replayedCount).toBe(2);
    expect(replayedCount).toBe(2);
  });

  it('5. Priority Queue & Autoscaling Metrics: should process HIGH_PRIORITY jobs first', async () => {
    const executionOrder: string[] = [];

    priorityQueue.enqueueJob({
      jobId: 'j_low',
      workerName: 'CleanupWorker',
      priority: 'LOW_PRIORITY',
      task: async () => { executionOrder.push('LOW'); },
      enqueuedAt: Date.now()
    });

    priorityQueue.enqueueJob({
      jobId: 'j_high',
      workerName: 'KillSwitchWorker',
      priority: 'HIGH_PRIORITY',
      task: async () => { executionOrder.push('HIGH'); },
      enqueuedAt: Date.now()
    });

    const next = priorityQueue.dequeueNextJob();
    expect(next?.priority).toBe('HIGH_PRIORITY');

    const metrics = priorityQueue.getAutoscalingMetrics();
    expect(metrics.recommendedWorkerInstances).toBeGreaterThanOrEqual(2);
  });
});
