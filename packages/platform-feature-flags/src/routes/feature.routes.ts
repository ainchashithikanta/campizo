/**
 * Platform Feature Flags Routes & Fastify Router Handlers
 */

import { buildRequestContext } from '../middleware/request-context.js';
import { RequestLogger } from '../middleware/request-logger.js';
import { IdempotencyStore } from '../middleware/idempotency.js';
import { authorizeRole } from '../middleware/rbac.js';
import { buildErrorResponse } from '../errors/http-error-handler.js';

import { FeatureController } from '../controllers/feature.controller.js';
import { EvaluationController } from '../controllers/evaluation.controller.js';
import { GroupController } from '../controllers/group.controller.js';
import { DependencyController } from '../controllers/dependency.controller.js';
import { RolloutController } from '../controllers/rollout.controller.js';
import { ApprovalController } from '../controllers/approval.controller.js';
import { SnapshotController } from '../controllers/snapshot.controller.js';
import { KillSwitchController } from '../controllers/kill-switch.controller.js';
import { EnvironmentController } from '../controllers/environment.controller.js';
import { TemplateController } from '../controllers/template.controller.js';
import { PackController } from '../controllers/pack.controller.js';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { HealthController } from '../controllers/health.controller.js';

import { createFeatureSchema } from '../validators/feature.validators.js';
import { evaluateFeatureSchema, bulkEvaluateSchema, simulateSchema } from '../validators/evaluation.validators.js';
import { createRolloutSchema } from '../validators/rollout.validators.js';
import { createApprovalSchema } from '../validators/approval.validators.js';
import { createSnapshotSchema } from '../validators/snapshot.validators.js';

export interface RouteHandlerDependencies {
  featureCtrl: FeatureController;
  evalCtrl: EvaluationController;
  groupCtrl: GroupController;
  depCtrl: DependencyController;
  rolloutCtrl: RolloutController;
  apprCtrl: ApprovalController;
  snapCtrl: SnapshotController;
  ksCtrl: KillSwitchController;
  envCtrl: EnvironmentController;
  tplCtrl: TemplateController;
  packCtrl: PackController;
  analyticsCtrl: AnalyticsController;
  healthCtrl: HealthController;
  logger: RequestLogger;
  idempotencyStore: IdempotencyStore;
}

export class FeatureApiRouter {
  constructor(private readonly deps: RouteHandlerDependencies) {}

  async handleRequest(
    method: string,
    path: string,
    headers: Record<string, string | string[] | undefined>,
    body?: any,
    params?: Record<string, string>
  ): Promise<{ statusCode: number; payload: unknown }> {
    const startTime = performance.now();
    const ctx = buildRequestContext(headers);

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()) && ctx.idempotencyKey) {
      const cached = this.deps.idempotencyStore.get(ctx.idempotencyKey);
      if (cached) {
        return { statusCode: cached.statusCode, payload: cached.body };
      }
    }

    try {
      let statusCode = 200;
      let payload: unknown;

      const upperMethod = method.toUpperCase();

      if (upperMethod === 'GET' && path === '/api/v1/feature-flags/health') {
        payload = await this.deps.healthCtrl.getHealth(ctx);
      } else if (upperMethod === 'GET' && path === '/api/v1/feature-flags') {
        authorizeRole(ctx, ['PLATFORM_ADMIN', 'ENGINEERING_LEAD', 'OPERATIONS', 'SUPPORT', 'READONLY_ADMIN']);
        payload = await this.deps.featureCtrl.listFlags(ctx);
      } else if (upperMethod === 'POST' && path === '/api/v1/feature-flags') {
        authorizeRole(ctx, ['PLATFORM_ADMIN', 'ENGINEERING_LEAD']);
        const validated = createFeatureSchema.parse(body);
        statusCode = 201;
        payload = await this.deps.featureCtrl.createFlag(validated, ctx);
      } else if (upperMethod === 'GET' && params?.key && path.startsWith('/api/v1/feature-flags/')) {
        payload = await this.deps.featureCtrl.getFlag(params.key, ctx);
      } else if (upperMethod === 'POST' && params?.key && path.endsWith('/enable')) {
        authorizeRole(ctx, ['PLATFORM_ADMIN', 'ENGINEERING_LEAD']);
        payload = await this.deps.featureCtrl.enableFlag(params.key, ctx);
      } else if (upperMethod === 'POST' && params?.key && path.endsWith('/disable')) {
        authorizeRole(ctx, ['PLATFORM_ADMIN', 'ENGINEERING_LEAD']);
        payload = await this.deps.featureCtrl.disableFlag(params.key, ctx);
      } else if (upperMethod === 'POST' && path === '/api/v1/feature-flags/evaluate') {
        const validated = evaluateFeatureSchema.parse(body);
        payload = await this.deps.evalCtrl.evaluate(validated, ctx);
      } else if (upperMethod === 'POST' && path === '/api/v1/feature-flags/evaluate/bulk') {
        const validated = bulkEvaluateSchema.parse(body);
        payload = await this.deps.evalCtrl.bulkEvaluate(validated, ctx);
      } else if (upperMethod === 'POST' && path === '/api/v1/feature-flags/evaluate/dry-run') {
        payload = await this.deps.evalCtrl.dryRun(body || {}, ctx);
      } else if (upperMethod === 'POST' && path === '/api/v1/feature-flags/evaluate/simulate') {
        const validated = simulateSchema.parse(body);
        payload = await this.deps.evalCtrl.simulate(validated, ctx);
      } else if (upperMethod === 'POST' && path === '/api/v1/feature-flags/groups') {
        authorizeRole(ctx, ['PLATFORM_ADMIN', 'ENGINEERING_LEAD']);
        payload = await this.deps.groupCtrl.createGroup(body, ctx);
      } else if (upperMethod === 'GET' && path === '/api/v1/feature-flags/dependencies/validate-graph') {
        payload = await this.deps.depCtrl.validateGraph(ctx);
      } else if (upperMethod === 'POST' && path.includes('/rollouts')) {
        authorizeRole(ctx, ['PLATFORM_ADMIN', 'ENGINEERING_LEAD']);
        const validated = createRolloutSchema.parse(body);
        payload = await this.deps.rolloutCtrl.createRollout(validated, ctx);
      } else if (upperMethod === 'POST' && path === '/api/v1/feature-flags/approvals') {
        authorizeRole(ctx, ['PLATFORM_ADMIN', 'ENGINEERING_LEAD', 'OPERATIONS']);
        const validated = createApprovalSchema.parse(body);
        payload = await this.deps.apprCtrl.createApproval(validated, ctx);
      } else if (upperMethod === 'POST' && path === '/api/v1/feature-flags/snapshots') {
        authorizeRole(ctx, ['PLATFORM_ADMIN', 'OPERATIONS']);
        const validated = createSnapshotSchema.parse(body);
        payload = await this.deps.snapCtrl.createSnapshot(validated, ctx);
      } else if (upperMethod === 'POST' && path === '/api/v1/feature-flags/kill-switches/activate') {
        authorizeRole(ctx, ['PLATFORM_ADMIN', 'OPERATIONS', 'ENGINEERING_LEAD']);
        payload = await this.deps.ksCtrl.activate(body, ctx);
      } else if (upperMethod === 'POST' && path === '/api/v1/feature-flags/kill-switches/deactivate') {
        authorizeRole(ctx, ['PLATFORM_ADMIN', 'OPERATIONS']);
        payload = await this.deps.ksCtrl.deactivate(body, ctx);
      } else if (upperMethod === 'GET' && path === '/api/v1/feature-flags/environments/compare') {
        payload = await this.deps.envCtrl.compare(ctx);
      } else if (upperMethod === 'POST' && path === '/api/v1/feature-flags/templates') {
        authorizeRole(ctx, ['PLATFORM_ADMIN']);
        payload = await this.deps.tplCtrl.createTemplate(body, ctx);
      } else if (upperMethod === 'POST' && path === '/api/v1/feature-flags/packs') {
        authorizeRole(ctx, ['PLATFORM_ADMIN']);
        payload = await this.deps.packCtrl.createPack(body, ctx);
      } else if (upperMethod === 'GET' && path === '/api/v1/feature-flags/telemetry') {
        payload = await this.deps.analyticsCtrl.getTelemetry(params?.key, ctx);
      } else {
        statusCode = 404;
        payload = buildErrorResponse(new Error(`Route ${method} ${path} not found`), ctx);
      }

      if (ctx.idempotencyKey) {
        this.deps.idempotencyStore.save(ctx.idempotencyKey, statusCode, payload);
      }

      const latencyMs = performance.now() - startTime;
      this.deps.logger.logRequest(ctx, method, path, statusCode, latencyMs);

      return { statusCode, payload };
    } catch (err) {
      const errResponse = buildErrorResponse(err, ctx);
      const statusCode = errResponse.error?.httpStatus || 500;
      const latencyMs = performance.now() - startTime;
      this.deps.logger.logRequest(ctx, method, path, statusCode, latencyMs);

      return { statusCode, payload: errResponse };
    }
  }
}
