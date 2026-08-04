export * from './module-manifest.js';
export * from './module.interface.js';
export * from './sandbox.js';
export * from './module-registry.js';
export * from './event-bus.js';
export * from './examples/hello.module.js';

import type { PlatformModule, ModuleStatus } from './module.interface.js';
export type CollegeHubModule = PlatformModule;
export type ModuleHealthStatus = ModuleStatus;
