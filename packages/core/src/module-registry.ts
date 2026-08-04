import type { FastifyInstance } from 'fastify';
import { logger } from '@college-hub/logger';
import type { PlatformModule, ModuleStatus, ModuleHealth } from './module.interface.js';
import type { EventBus } from './event-bus.js';
import { safeExecute } from './sandbox.js';

export const CURRENT_KERNEL_VERSION = '1.0.0';

export class DynamicModuleRegistry {
  private modules = new Map<string, PlatformModule>();
  private statuses = new Map<string, ModuleStatus>();

  public register(module: PlatformModule): void {
    const { id, minKernelVersion } = module.manifest;

    logger.info(
      { moduleId: id, version: module.manifest.version },
      `Registering module '${id}' with application kernel`
    );

    // 1. Version Compatibility Check
    if (minKernelVersion > CURRENT_KERNEL_VERSION) {
      throw new Error(
        `Module '${id}' requires minimum kernel version '${minKernelVersion}', but current kernel version is '${CURRENT_KERNEL_VERSION}'`
      );
    }

    // 2. Duplicate Registration Guard
    if (this.modules.has(id)) {
      logger.warn({ moduleId: id }, `Module '${id}' is already registered. Overwriting registration.`);
    }

    this.modules.set(id, module);
    this.statuses.set(id, 'REGISTERED');

    if (module.register) {
      safeExecute(id, 'register', () => module.register!());
    }
  }

  public unregister(moduleId: string): boolean {
    if (!this.modules.has(moduleId)) {
      return false;
    }
    const module = this.modules.get(moduleId)!;
    if (module.dispose) {
      safeExecute(moduleId, 'dispose', () => module.dispose!());
    }
    this.modules.delete(moduleId);
    this.statuses.set(moduleId, 'UNREGISTERED');
    logger.info({ moduleId }, `Unregistered module '${moduleId}'`);
    return true;
  }

  public validateDependencies(): void {
    for (const [id, module] of this.modules) {
      for (const depId of module.manifest.dependencies) {
        if (!this.modules.has(depId)) {
          throw new Error(`Unsatisfied dependency: Module '${id}' requires missing dependency '${depId}'`);
        }
      }
    }
  }

  public getOrderedModules(): PlatformModule[] {
    this.validateDependencies();

    const result: PlatformModule[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (moduleId: string) => {
      if (visiting.has(moduleId)) {
        throw new Error(`Circular dependency detected involving module '${moduleId}'`);
      }
      if (!visited.has(moduleId)) {
        visiting.add(moduleId);
        const module = this.modules.get(moduleId);
        if (module) {
          for (const depId of module.manifest.dependencies) {
            visit(depId);
          }
        }
        visiting.delete(moduleId);
        visited.add(moduleId);
        if (module) result.push(module);
      }
    };

    for (const moduleId of this.modules.keys()) {
      visit(moduleId);
    }

    return result;
  }

  public async initializeAll(app: FastifyInstance, eventBus: EventBus): Promise<void> {
    const orderedModules = this.getOrderedModules();

    for (const module of orderedModules) {
      const id = module.manifest.id;
      this.statuses.set(id, 'INITIALIZING');
      logger.info({ moduleId: id }, `Initializing module '${id}'...`);

      const execution = await safeExecute(id, 'initialize', () => module.initialize(app, eventBus));

      if (execution.success) {
        this.statuses.set(id, 'ACTIVE');
      } else {
        this.statuses.set(id, 'FAILED');
      }
    }
  }

  public async startAll(): Promise<void> {
    for (const module of this.modules.values()) {
      if (module.start) {
        await safeExecute(module.manifest.id, 'start', () => module.start!());
      }
    }
  }

  public async stopAll(): Promise<void> {
    for (const module of this.modules.values()) {
      const id = module.manifest.id;
      if (module.stop) {
        await safeExecute(id, 'stop', () => module.stop!());
        this.statuses.set(id, 'STOPPED');
      }
    }
  }

  public async performHealthCheck(): Promise<Record<string, ModuleHealth>> {
    const healthMap: Record<string, ModuleHealth> = {};

    for (const [id, module] of this.modules) {
      const currentStatus = this.statuses.get(id) || 'UNREGISTERED';
      const healthRes = await safeExecute(id, 'healthCheck', () => module.healthCheck(), {
        moduleId: id,
        status: 'FAILED' as ModuleStatus,
        healthy: false,
        message: 'Module health check threw an exception'
      });

      healthMap[id] = healthRes.result || {
        moduleId: id,
        status: currentStatus,
        healthy: false,
        message: 'Module execution failed'
      };
    }

    return healthMap;
  }

  public getRegisteredModules(): string[] {
    return Array.from(this.modules.keys());
  }

  public getModuleStatus(moduleId: string): ModuleStatus {
    return this.statuses.get(moduleId) || 'UNREGISTERED';
  }
}
