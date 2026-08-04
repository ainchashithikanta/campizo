import { logger } from '@college-hub/logger';
import type { BaseProvider, ProviderType, ProviderHealth } from './base.interface.js';
import { CircuitBreaker } from './circuit-breaker.js';

export class ProviderManager {
  private providers = new Map<ProviderType, BaseProvider[]>();
  private circuitBreakers = new Map<string, CircuitBreaker>();

  public register(provider: BaseProvider): void {
    const list = this.providers.get(provider.type) || [];
    list.push(provider);
    // Sort by priority (1 is highest priority)
    list.sort((a, b) => (a.priority || 10) - (b.priority || 10));
    this.providers.set(provider.type, list);

    this.circuitBreakers.set(provider.name, new CircuitBreaker());
    logger.info(
      { providerName: provider.name, type: provider.type, priority: provider.priority || 10 },
      'Provider registered'
    );
  }

  public getProvider<T extends BaseProvider>(type: ProviderType): T {
    const list = this.providers.get(type);
    if (!list || list.length === 0) {
      throw new Error(`No provider registered for provider type '${type}'`);
    }
    return list[0] as T;
  }

  public getProvidersForType<T extends BaseProvider>(type: ProviderType): T[] {
    return (this.providers.get(type) || []) as T[];
  }

  /**
   * Automatic Failover Engine.
   * Attempts execution on highest priority provider. If it fails, fails over to next priority provider.
   */
  public async executeWithFailover<TProvider extends BaseProvider, TResult>(
    type: ProviderType,
    operationName: string,
    action: (provider: TProvider) => Promise<TResult>
  ): Promise<TResult> {
    const providers = this.getProvidersForType<TProvider>(type);
    if (providers.length === 0) {
      throw new Error(`No providers available for failover execution of type '${type}'`);
    }

    const errors: Error[] = [];

    for (const provider of providers) {
      const cb = this.circuitBreakers.get(provider.name);

      try {
        if (cb) {
          return await cb.execute(() => action(provider));
        } else {
          return await action(provider);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.warn(
          { providerName: provider.name, operationName, err: error },
          `Provider '${provider.name}' failed during '${operationName}'. Attempting failover to next provider...`
        );
        errors.push(error);
      }
    }

    throw new Error(
      `All providers for type '${type}' failed during operation '${operationName}'. Errors: ${errors.map((e) => e.message).join('; ')}`
    );
  }

  public async performHealthCheckAll(): Promise<Record<string, ProviderHealth>> {
    const results: Record<string, ProviderHealth> = {};
    for (const list of this.providers.values()) {
      for (const provider of list) {
        const startTime = Date.now();
        try {
          const health = await provider.healthCheck();
          results[provider.name] = {
            ...health,
            latencyMs: Date.now() - startTime
          };
        } catch (error) {
          results[provider.name] = {
            healthy: false,
            latencyMs: Date.now() - startTime,
            message: error instanceof Error ? error.message : String(error)
          };
        }
      }
    }
    return results;
  }
}
