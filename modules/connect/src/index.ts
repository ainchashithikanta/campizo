/**
 * Campus Connect Module — Foundation & HTTP Layer Entry Point (@college-hub/mod-connect)
 */

export * from './schema/connect.schema.js';
export * from './errors/domain-errors.js';
export * from './errors/application-errors.js';
export * from './errors/http-error-handler.js';
export * from './domain/events.js';
export * from './domain/invariants.js';
export * from './domain/repository.interface.js';
export * from './repositories/drizzle-connect.repository.js';
export * from './repositories/in-memory-connect.repository.js';
export * from './queries/connect.queries.js';
export * from './use-cases/connect.use-cases.js';

export * from './middleware/request-context.js';
export * from './middleware/request-logger.js';
export * from './middleware/idempotency.js';
export * from './middleware/privacy-guard.js';
export * from './middleware/rbac.js';
export * from './middleware/http-error-handler.js';

export * from './controllers/connect.controller.js';
export * from './controllers/intent.controller.js';
export * from './controllers/connection.controller.js';
export * from './controllers/conversation.controller.js';
export * from './controllers/message.controller.js';
export * from './controllers/study-group.controller.js';
export * from './controllers/project.controller.js';
export * from './controllers/mentorship.controller.js';
export * from './controllers/recommendation.controller.js';
export * from './controllers/privacy.controller.js';
export * from './controllers/notification.controller.js';
export * from './controllers/moderation.controller.js';
export * from './controllers/activity.controller.js';

export * from './routes/connect.routes.js';

export * from './events/event-envelope.js';
export * from './events/retry-policy.js';
export * from './events/dlq-manager.js';
export * from './events/event-router.js';

export * from './metrics/worker-metrics.js';
export * from './metrics/recommendation-metrics.js';
export * from './metrics/system-metrics.js';

export * from './workers/recommendation.worker.js';
export * from './workers/intent-expiry.worker.js';
export * from './workers/notification.worker.js';
export * from './workers/search-index.worker.js';
export * from './workers/trust-score.worker.js';
export * from './workers/relationship.worker.js';
export * from './workers/moderation.worker.js';
export * from './workers/activity.worker.js';
export * from './workers/analytics.worker.js';
export * from './workers/cleanup.worker.js';

export * from './resilience/circuit-breaker.js';
export * from './resilience/health-monitor.js';
export * from './resilience/failure-simulator.js';
export * from './resilience/chaos-runner.js';
export * from './resilience/rollback-manager.js';
export * from './resilience/snapshot-recovery.js';
export * from './resilience/event-replayer.js';
export * from './resilience/cache-recovery.js';

export * from './benchmark/performance-benchmark.js';
