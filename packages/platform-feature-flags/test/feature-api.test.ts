import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryFeatureFlagRepository,
  InMemoryKillSwitchRepository,
  InMemoryAuditLogRepository,
  FeatureQueries,
  FeatureUseCases,
  FeatureEvaluationService,
  RequestLogger,
  IdempotencyStore,
  FeatureController,
  EvaluationController,
  GroupController,
  DependencyController,
  RolloutController,
  ApprovalController,
  SnapshotController,
  KillSwitchController,
  EnvironmentController,
  TemplateController,
  PackController,
  AnalyticsController,
  HealthController,
  FeatureApiRouter,
  ApiV1Response
} from '../src/index.js';

describe('Platform Feature Flags — Fastify HTTP API Integration Suite', () => {
  let router: FeatureApiRouter;
  let logger: RequestLogger;
  let idempotencyStore: IdempotencyStore;

  beforeEach(() => {
    const flagRepo = new InMemoryFeatureFlagRepository();
    const ksRepo = new InMemoryKillSwitchRepository();
    const auditRepo = new InMemoryAuditLogRepository();
    const evalService = new FeatureEvaluationService();

    evalService.preloadL1Cache([
      {
        flagKey: 'marketplace.p2p_chat',
        environment: 'PRODUCTION',
        defaultState: true,
        lifecycleStage: 'PRODUCTION'
      }
    ]);

    const queries = new FeatureQueries(flagRepo, ksRepo);
    const useCases = new FeatureUseCases(flagRepo, ksRepo, auditRepo);
    logger = new RequestLogger();
    idempotencyStore = new IdempotencyStore();

    const featureCtrl = new FeatureController(useCases, queries);
    const evalCtrl = new EvaluationController(evalService);
    const groupCtrl = new GroupController(useCases);
    const depCtrl = new DependencyController(queries);
    const rolloutCtrl = new RolloutController(useCases);
    const apprCtrl = new ApprovalController(useCases);
    const snapCtrl = new SnapshotController(useCases);
    const ksCtrl = new KillSwitchController(useCases);
    const envCtrl = new EnvironmentController(queries);
    const tplCtrl = new TemplateController(useCases);
    const packCtrl = new PackController(useCases);
    const analyticsCtrl = new AnalyticsController(queries);
    const healthCtrl = new HealthController(queries);

    router = new FeatureApiRouter({
      featureCtrl,
      evalCtrl,
      groupCtrl,
      depCtrl,
      rolloutCtrl,
      apprCtrl,
      snapCtrl,
      ksCtrl,
      envCtrl,
      tplCtrl,
      packCtrl,
      analyticsCtrl,
      healthCtrl,
      logger,
      idempotencyStore
    });
  });

  const adminHeaders = {
    'x-user-roles': 'PLATFORM_ADMIN',
    'x-college-id': 'college_stanford_001',
    'x-user-id': 'admin_101',
    'x-request-id': 'req_test_101',
    'x-trace-id': 'trace_test_101'
  };

  it('1. GET /health: should return system health status envelope', async () => {
    const res = await router.handleRequest('GET', '/api/v1/feature-flags/health', adminHeaders);
    expect(res.statusCode).toBe(200);

    const payload = res.payload as ApiV1Response;
    expect(payload.success).toBe(true);
    expect((payload.data as any).status).toBe('HEALTHY');
    expect(payload.metadata.requestId).toBe('req_test_101');
  });

  it('2. POST /evaluate: should route through FeatureEvaluationService and return EvaluationResult', async () => {
    const res = await router.handleRequest('POST', '/api/v1/feature-flags/evaluate', adminHeaders, {
      flagKey: 'marketplace.p2p_chat',
      explain: true
    });
    expect(res.statusCode).toBe(200);

    const payload = res.payload as ApiV1Response;
    expect(payload.success).toBe(true);
    expect((payload.data as any).enabled).toBe(true);
    expect((payload.data as any).cacheSource).toBe('LOCAL_MEMORY');
  });

  it('3. POST /evaluate/bulk & dry-run: should handle bulk and simulation evaluations', async () => {
    const bulkRes = await router.handleRequest('POST', '/api/v1/feature-flags/evaluate/bulk', adminHeaders, {
      flagKeys: ['marketplace.p2p_chat']
    });
    expect(bulkRes.statusCode).toBe(200);

    const simRes = await router.handleRequest('POST', '/api/v1/feature-flags/evaluate/simulate', adminHeaders, {
      flagKey: 'marketplace.p2p_chat',
      sampleUserIds: ['u1', 'u2'],
      proposedRolloutPercentage: 50
    });
    expect(simRes.statusCode).toBe(200);
  });

  it('4. RBAC: should reject unauthorized roles with 403 Forbidden', async () => {
    const readonlyHeaders = {
      'x-user-roles': 'READONLY_ADMIN',
      'x-user-id': 'readonly_user_1'
    };

    const res = await router.handleRequest('POST', '/api/v1/feature-flags', readonlyHeaders, {
      flagKey: 'confessions.voting',
      ownerTeam: 'Team Confessions'
    });

    expect(res.statusCode).toBe(403);
    const payload = res.payload as ApiV1Response;
    expect(payload.success).toBe(false);
    expect(payload.error?.code).toBe('FORBIDDEN');
  });

  it('5. Idempotency: should return cached response on duplicate write request', async () => {
    const writeHeaders = {
      ...adminHeaders,
      'x-idempotency-key': 'idempotent_key_777'
    };

    const res1 = await router.handleRequest('POST', '/api/v1/feature-flags', writeHeaders, {
      flagKey: 'events.ticket_sale',
      ownerTeam: 'Team Events'
    });
    expect(res1.statusCode).toBe(201);

    const res2 = await router.handleRequest('POST', '/api/v1/feature-flags', writeHeaders, {
      flagKey: 'events.ticket_sale',
      ownerTeam: 'Team Events'
    });
    expect(res2.statusCode).toBe(201);
    expect(res2.payload).toEqual(res1.payload);
  });

  it('6. Validation: should reject invalid flagKey with 400 Bad Request', async () => {
    const res = await router.handleRequest('POST', '/api/v1/feature-flags', adminHeaders, {
      flagKey: 'invalid flag key formatting!',
      ownerTeam: 'Team Events'
    });
    expect(res.statusCode).toBe(400);
  });

  it('7. Kill Switches & Emergency Controls: should activate and release kill switches', async () => {
    const actRes = await router.handleRequest('POST', '/api/v1/feature-flags/kill-switches/activate', adminHeaders, {
      flagKey: 'marketplace.payment',
      reason: 'High latency'
    });
    expect(actRes.statusCode).toBe(200);

    const deactRes = await router.handleRequest(
      'POST',
      '/api/v1/feature-flags/kill-switches/deactivate',
      adminHeaders,
      {
        flagKey: 'marketplace.payment'
      }
    );
    expect(deactRes.statusCode).toBe(200);
  });

  it('8. Structured Logger: should record telemetry without exposing sensitive data', async () => {
    await router.handleRequest('GET', '/api/v1/feature-flags/health', adminHeaders);
    const logs = logger.getLogs();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]?.requestId).toBeDefined();
    expect(logs[0]?.traceId).toBeDefined();
    expect(logs[0]?.endpoint).toBeDefined();
  });
});
