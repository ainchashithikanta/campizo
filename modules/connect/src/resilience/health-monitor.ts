/**
 * Campus Connect — Health Monitor Specification
 * Exposes system liveness, readiness, dependency health, queue health, worker health, and recommendation pipeline health.
 * NEVER EXPOSES TrustScore, RECOMMENDATION INTERNALS, PRIVATE PROFILE DATA, OR SECRETS.
 */

import { ComponentCircuitBreakers } from './circuit-breaker.js';

export interface HealthReport {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  liveness: boolean;
  readiness: boolean;
  dependencies: {
    postgres: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    redis: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    searchIndex: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  };
  queues: {
    notificationQueue: 'HEALTHY' | 'BACKLOGGED' | 'UNHEALTHY';
  };
  workers: {
    recommendationWorker: 'UP' | 'DOWN';
    notificationWorker: 'UP' | 'DOWN';
    searchIndexWorker: 'UP' | 'DOWN';
  };
  recommendationPipeline: 'HEALTHY' | 'DEGRADED';
  timestamp: string;
}

export class HealthMonitor {
  constructor(private readonly circuitBreakers: ComponentCircuitBreakers) {}

  checkHealth(): HealthReport {
    const pgState = this.circuitBreakers.getBreaker('PostgreSQL').getState();
    const redisState = this.circuitBreakers.getBreaker('Redis').getState();
    const searchState = this.circuitBreakers.getBreaker('SearchIndex').getState();
    const notifState = this.circuitBreakers.getBreaker('NotificationQueue').getState();
    const recState = this.circuitBreakers.getBreaker('RecommendationEngine').getState();

    const pgHealth = pgState === 'CLOSED' ? 'HEALTHY' : pgState === 'HALF_OPEN' ? 'DEGRADED' : 'UNHEALTHY';
    const redisHealth = redisState === 'CLOSED' ? 'HEALTHY' : redisState === 'HALF_OPEN' ? 'DEGRADED' : 'UNHEALTHY';
    const searchHealth = searchState === 'CLOSED' ? 'HEALTHY' : searchState === 'HALF_OPEN' ? 'DEGRADED' : 'UNHEALTHY';

    const isLiveness = pgHealth !== 'UNHEALTHY';
    const isReadiness = pgHealth === 'HEALTHY' && redisHealth !== 'UNHEALTHY';

    const overallStatus = !isLiveness
      ? 'UNHEALTHY'
      : !isReadiness || redisHealth === 'DEGRADED' || recState !== 'CLOSED'
        ? 'DEGRADED'
        : 'HEALTHY';

    return {
      status: overallStatus,
      liveness: isLiveness,
      readiness: isReadiness,
      dependencies: {
        postgres: pgHealth,
        redis: redisHealth,
        searchIndex: searchHealth
      },
      queues: {
        notificationQueue: notifState === 'CLOSED' ? 'HEALTHY' : 'UNHEALTHY'
      },
      workers: {
        recommendationWorker: recState !== 'OPEN' ? 'UP' : 'DOWN',
        notificationWorker: notifState !== 'OPEN' ? 'UP' : 'DOWN',
        searchIndexWorker: searchState !== 'OPEN' ? 'UP' : 'DOWN'
      },
      recommendationPipeline: recState === 'CLOSED' ? 'HEALTHY' : 'DEGRADED',
      timestamp: new Date().toISOString()
    };
  }
}
