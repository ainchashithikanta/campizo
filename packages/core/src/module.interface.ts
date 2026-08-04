import type { FastifyInstance } from 'fastify';
import type { ModuleManifest } from './module-manifest.js';
import type { EventBus } from './event-bus.js';

export type ModuleStatus =
  'UNREGISTERED' | 'REGISTERED' | 'INITIALIZING' | 'ACTIVE' | 'STOPPED' | 'DEGRADED' | 'FAILED';

export interface ModuleHealth {
  moduleId: string;
  status: ModuleStatus;
  healthy: boolean;
  message?: string;
  details?: Record<string, unknown>;
}

export interface PlatformModule {
  readonly manifest: ModuleManifest;
  register?(): Promise<void> | void;
  initialize(app: FastifyInstance, eventBus: EventBus): Promise<void> | void;
  start?(): Promise<void> | void;
  stop?(): Promise<void> | void;
  dispose?(): Promise<void> | void;
  healthCheck(): Promise<ModuleHealth> | ModuleHealth;
}
