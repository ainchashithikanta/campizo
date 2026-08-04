import type { FastifyInstance } from 'fastify';
import type { PlatformModule, ModuleHealth } from '../module.interface.js';
import type { ModuleManifest } from '../module-manifest.js';
import type { EventBus } from '../event-bus.js';

/**
 * Example "Hello Module" demonstrating canonical module best practices.
 */
export class HelloExampleModule implements PlatformModule {
  public readonly manifest: ModuleManifest = {
    id: 'hello-example',
    name: 'Hello Example Demonstration Module',
    version: '1.0.0',
    minKernelVersion: '1.0.0',
    dependencies: [],
    permissions: ['hello:read'],
    routesPrefix: '/api/v1/hello'
  };

  private isStarted = false;

  public register(): void {
    // Optional initialization during registry enrollment
  }

  public initialize(app: FastifyInstance, eventBus: EventBus): void {
    // 1. Mount HTTP Routes
    app.get('/api/v1/hello', async (_request, reply) => {
      return reply.send({
        success: true,
        data: { message: 'Hello from College Hub Modular Kernel!' }
      });
    });

    // 2. Register Event Bus Subscribers
    eventBus.subscribe('USER_REGISTERED', async (_payload) => {
      // Process event asynchronously
    });

    this.isStarted = true;
  }

  public start(): void {
    this.isStarted = true;
  }

  public stop(): void {
    this.isStarted = false;
  }

  public healthCheck(): ModuleHealth {
    return {
      moduleId: this.manifest.id,
      status: this.isStarted ? 'ACTIVE' : 'STOPPED',
      healthy: this.isStarted,
      details: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage().heapUsed
      }
    };
  }
}
