import { describe, it, expect, beforeEach } from 'vitest';
import {
  DLQManager,
  EventRouter,
  ConfigurationWorker,
  SnapshotWorker,
  ApprovalWorker,
  RolloutWorker,
  AnalyticsWorker,
  StaleFeatureWorker,
  DependencyValidatorWorker,
  CacheRefreshWorker,
  NotificationWorker,
  HealthWorker,
  CleanupWorker,
  FeatureCreatedEvent
} from '../src/index.js';

describe('Platform Feature Flags — Asynchronous Worker Pipeline Suite', () => {
  let dlqManager: DLQManager;
  let eventRouter: EventRouter;
  let configWorker: ConfigurationWorker;
  let snapshotWorker: SnapshotWorker;
  let approvalWorker: ApprovalWorker;
  let rolloutWorker: RolloutWorker;
  let analyticsWorker: AnalyticsWorker;
  let staleWorker: StaleFeatureWorker;
  let depValidator: DependencyValidatorWorker;
  let cacheRefreshWorker: CacheRefreshWorker;
  let notifWorker: NotificationWorker;
  let healthWorker: HealthWorker;
  let cleanupWorker: CleanupWorker;

  beforeEach(() => {
    dlqManager = new DLQManager();
    eventRouter = new EventRouter(dlqManager);
    configWorker = new ConfigurationWorker();
    snapshotWorker = new SnapshotWorker();
    approvalWorker = new ApprovalWorker();
    rolloutWorker = new RolloutWorker();
    analyticsWorker = new AnalyticsWorker();
    staleWorker = new StaleFeatureWorker();
    depValidator = new DependencyValidatorWorker();
    cacheRefreshWorker = new CacheRefreshWorker();
    notifWorker = new NotificationWorker();
    healthWorker = new HealthWorker();
    cleanupWorker = new CleanupWorker();
  });

  it('1. DLQ Manager: should route poison messages to Dead-Letter Queue after 3 retries', () => {
    const eventId = 'evt_poison_101';

    // Retry 1
    const res1 = dlqManager.handleFailure({
      eventId,
      workerName: 'ConfigurationWorker',
      requestId: 'req_1',
      traceId: 'trace_1',
      payload: {},
      attemptCount: 1,
      errorReason: 'DB connection timeout'
    });
    expect(res1.routedToDLQ).toBe(false);
    expect(res1.retryBackoffMs).toBe(100);

    // Retry 3 -> Routes to DLQ
    const res3 = dlqManager.handleFailure({
      eventId,
      workerName: 'ConfigurationWorker',
      requestId: 'req_1',
      traceId: 'trace_1',
      payload: {},
      attemptCount: 3,
      errorReason: 'DB connection timeout'
    });
    expect(res3.routedToDLQ).toBe(true);

    const poisonMsgs = dlqManager.getPoisonMessages();
    expect(poisonMsgs.length).toBe(1);
    expect(poisonMsgs[0]?.workerName).toBe('ConfigurationWorker');
  });

  it('2. Event Router: should enforce idempotency and skip duplicate events', async () => {
    let callCount = 0;
    eventRouter.registerHandler('FeatureCreated', async () => {
      callCount++;
    });

    const event: FeatureCreatedEvent = {
      eventId: 'evt_unique_99',
      eventType: 'FeatureCreated',
      occurredAt: new Date().toISOString(),
      flagKey: 'marketplace.p2p_chat',
      category: 'FEATURE_MANAGEMENT',
      owner: 'Team Marketplace',
      defaultState: false
    };

    await eventRouter.routeEvent(event);
    expect(callCount).toBe(1);

    // Duplicate call with same eventId
    await eventRouter.routeEvent(event);
    expect(callCount).toBe(1); // Idempotency check prevented re-execution!
  });

  it('3. ConfigurationWorker & CacheRefreshWorker: should update config and trigger cache invalidation', async () => {
    const event: FeatureCreatedEvent = {
      eventId: 'evt_cfg_101',
      eventType: 'FeatureCreated',
      occurredAt: new Date().toISOString(),
      flagKey: 'marketplace.p2p_chat',
      category: 'FEATURE_MANAGEMENT',
      owner: 'Team Marketplace',
      defaultState: false
    };

    const envelope = {
      event,
      requestId: 'req_1',
      traceId: 'trace_1',
      configurationVersion: 1
    };

    const cfgRes = await configWorker.processConfigurationUpdate(envelope);
    expect(cfgRes.updated).toBe(true);
    expect(cfgRes.version).toBe(2);

    const refreshRes = await cacheRefreshWorker.triggerCacheInvalidation(envelope);
    expect(refreshRes.channelPublished).toBe(true);
    expect(refreshRes.latencyMs).toBeLessThan(50.0); // SLA < 50ms
  });

  it('4. SnapshotWorker: should compile environment configuration snapshot', async () => {
    const snapRes = await snapshotWorker.processSnapshotCreation({
      event: { eventId: 'evt_snap', eventType: 'SnapshotCreated', occurredAt: new Date().toISOString() },
      requestId: 'req_snap_1',
      traceId: 'trace_snap_1',
      configurationVersion: 1
    });

    expect(snapRes.snapshotId).toContain('snap_');
    expect(snapRes.hmacSignature).toContain('hmac_sig_');
  });

  it('5. AnalyticsWorker: sole writer flushing telemetry batches', async () => {
    await analyticsWorker.flushTelemetryBatch([
      { flagKey: 'marketplace.p2p_chat', collegeId: 'global', evaluationsCount: 10, enabledCount: 8, disabledCount: 2 }
    ]);
    expect(analyticsWorker.getBufferedCount()).toBe(1);
  });

  it('6. StaleFeatureWorker: should flag production features unchanged for >=60 days', async () => {
    const reports = await staleWorker.scanStaleFeatures([
      { flagKey: 'active_flag', ownerTeam: 'Team A', daysUnchanged: 10 },
      { flagKey: 'stale_flag_1', ownerTeam: 'Team B', daysUnchanged: 65 },
      { flagKey: 'stale_flag_2', ownerTeam: 'Team C', daysUnchanged: 95 }
    ]);

    expect(reports.length).toBe(2);
    expect(reports[0]?.recommendedAction).toBe('DEPRECATE');
    expect(reports[1]?.recommendedAction).toBe('REMOVE');
  });

  it('7. DependencyValidatorWorker: should validate DAG topology without circular dependencies', async () => {
    const graph = new Map<string, string[]>([['flagA', ['flagB']]]);
    const res = await depValidator.validateDependencyEdge('flagA', 'flagC', graph);
    expect(res.isValid).toBe(true);
  });

  it('8. NotificationWorker: should prepare notification payloads without external side-effects', async () => {
    const payload = await notifWorker.prepareNotification({
      event: { eventId: 'evt_n1', eventType: 'ApprovalRequested', occurredAt: new Date().toISOString() } as any,
      requestId: 'req_n1',
      traceId: 'trace_n1',
      configurationVersion: 1
    });

    expect(payload.title).toContain('Platform Event');
    expect(notifWorker.getPreparedPayloads().length).toBe(1);
  });

  it('9. HealthWorker & CleanupWorker: should execute background liveness and retention purges', async () => {
    const health = await healthWorker.runHealthProbe();
    expect(health.redisStatus).toBe('CONNECTED');

    const cleanup = await cleanupWorker.purgeExpiredArtifacts();
    expect(cleanup.purgedCount).toBeGreaterThan(0);
  });
});
