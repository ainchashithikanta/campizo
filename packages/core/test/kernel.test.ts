import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';
import {
  DynamicModuleRegistry,
  InMemoryEventBus,
  HelloExampleModule,
  CURRENT_KERNEL_VERSION,
  type PlatformModule
} from '../src/index.js';

describe('Modular Kernel & Lifecycle Management', () => {
  it('should register modules and track current status', () => {
    const registry = new DynamicModuleRegistry();
    const helloModule = new HelloExampleModule();

    registry.register(helloModule);
    expect(registry.getRegisteredModules()).toContain('hello-example');
    expect(registry.getModuleStatus('hello-example')).toBe('REGISTERED');
  });

  it('should throw error when module requires incompatible minKernelVersion', () => {
    const registry = new DynamicModuleRegistry();
    const incompatibleModule: PlatformModule = {
      manifest: {
        id: 'future-mod',
        name: 'Future Module',
        version: '1.0.0',
        minKernelVersion: '99.0.0',
        dependencies: [],
        permissions: []
      },
      initialize: () => {},
      healthCheck: () => ({ moduleId: 'future-mod', status: 'ACTIVE', healthy: true })
    };

    expect(() => registry.register(incompatibleModule)).toThrow(
      "Module 'future-mod' requires minimum kernel version '99.0.0'"
    );
  });

  it('should perform topological sort based on module dependencies', () => {
    const registry = new DynamicModuleRegistry();

    const moduleA: PlatformModule = {
      manifest: {
        id: 'module-a',
        name: 'Base Module A',
        version: '1.0.0',
        minKernelVersion: '1.0.0',
        dependencies: [],
        permissions: []
      },
      initialize: () => {},
      healthCheck: () => ({ moduleId: 'module-a', status: 'ACTIVE', healthy: true })
    };

    const moduleB: PlatformModule = {
      manifest: {
        id: 'module-b',
        name: 'Dependent Module B',
        version: '1.0.0',
        minKernelVersion: '1.0.0',
        dependencies: ['module-a'],
        permissions: []
      },
      initialize: () => {},
      healthCheck: () => ({ moduleId: 'module-b', status: 'ACTIVE', healthy: true })
    };

    // Register in reverse order
    registry.register(moduleB);
    registry.register(moduleA);

    const ordered = registry.getOrderedModules();
    expect(ordered[0]?.manifest.id).toBe('module-a');
    expect(ordered[1]?.manifest.id).toBe('module-b');
  });

  it('should isolate failures so a throwing module initialize hook does not crash kernel', async () => {
    const registry = new DynamicModuleRegistry();
    const app = Fastify();
    const eventBus = new InMemoryEventBus();

    const faultyModule: PlatformModule = {
      manifest: {
        id: 'faulty-mod',
        name: 'Faulty Module',
        version: '1.0.0',
        minKernelVersion: '1.0.0',
        dependencies: [],
        permissions: []
      },
      initialize: () => {
        throw new Error('Fatal initialization crash');
      },
      healthCheck: () => ({ moduleId: 'faulty-mod', status: 'FAILED', healthy: false })
    };

    registry.register(faultyModule);

    // Initialization should execute safely without crashing process
    await registry.initializeAll(app, eventBus);
    expect(registry.getModuleStatus('faulty-mod')).toBe('FAILED');
  });

  it('should initialize HelloExampleModule and mount HTTP endpoint', async () => {
    const registry = new DynamicModuleRegistry();
    const app = Fastify();
    const eventBus = new InMemoryEventBus();
    const helloModule = new HelloExampleModule();

    registry.register(helloModule);
    await registry.initializeAll(app, eventBus);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/hello'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data.message).toBe('Hello from College Hub Modular Kernel!');

    const healthMap = await registry.performHealthCheck();
    expect(healthMap['hello-example']?.healthy).toBe(true);
  });
});
