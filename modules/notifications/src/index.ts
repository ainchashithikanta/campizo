/**
 * Unified Notification Engine (@college-hub/mod-notifications)
 */

export * from './domain/entities.js';
export * from './domain/repository.interface.js';
export * from './domain/publisher.interface.js';

export * from './application/use-cases.js';

export * from './infrastructure/schema/notifications.schema.js';
export * from './infrastructure/repositories/in-memory-notification.repository.js';
export * from './infrastructure/repositories/drizzle-notification.repository.js';
export * from './infrastructure/publishers/generic-event-publisher.js';

export * from './presentation/validators.js';
export * from './presentation/controller.js';
export * from './presentation/routes.js';
