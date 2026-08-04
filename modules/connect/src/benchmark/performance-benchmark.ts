/**
 * Campus Connect — Performance Benchmark Suite
 * Deterministic benchmark execution measuring system operations against mandatory performance thresholds:
 * - Recommendation lookup: <100ms
 * - Recommendation generation: <150ms
 * - Discovery query: <80ms
 * - Notification preparation: <30ms
 * - Intent evaluation: <20ms
 * - Worker startup: <100ms
 * - Cache rebuild: <500ms
 */

import { ConnectQueryService } from '../queries/connect.queries.js';
import { ConnectUseCases, StudentIntentService, EventPublisher } from '../use-cases/connect.use-cases.js';
import { RecommendationWorker } from '../workers/recommendation.worker.js';
import { NotificationWorker } from '../workers/notification.worker.js';
import { CacheRecovery } from '../resilience/cache-recovery.js';
import { buildEventEnvelope } from '../events/event-envelope.js';
import { InMemoryConnectRepositoryProvider } from '../repositories/in-memory-connect.repository.js';

export interface BenchmarkResult {
  operation: string;
  targetMs: number;
  measuredMs: number;
  passed: boolean;
}

export interface FullBenchmarkReport {
  results: BenchmarkResult[];
  allPassed: boolean;
  executedAt: string;
}

export class PerformanceBenchmarkSuite {
  async runAllBenchmarks(): Promise<FullBenchmarkReport> {
    const repoProvider = new InMemoryConnectRepositoryProvider();
    const eventPublisher = new EventPublisher();
    const intentService = new StudentIntentService(repoProvider, eventPublisher);
    const useCases = new ConnectUseCases(repoProvider, eventPublisher, intentService);
    const queryService = new ConnectQueryService(repoProvider);
    const results: BenchmarkResult[] = [];

    // 1. Worker Startup Target: <100ms
    const startBegin = Date.now();
    const recWorker = new RecommendationWorker(useCases);
    const notifWorker = new NotificationWorker();
    const cacheRecovery = new CacheRecovery(queryService);
    const workerStartupMs = Date.now() - startBegin;
    results.push({
      operation: 'Worker startup',
      targetMs: 100,
      measuredMs: workerStartupMs,
      passed: workerStartupMs < 100
    });

    // 2. Intent Evaluation Target: <20ms
    const intentBegin = Date.now();
    await intentService.createIntent({
      id: 'int_bench_1',
      collegeId: 'college_stanford_001',
      studentProfileId: 'usr_bench_1',
      intentType: 'STUDY_PARTNER',
      title: 'Benchmark Pod',
      createdBy: 'usr_bench_1'
    });
    const intentEvalMs = Date.now() - intentBegin;
    results.push({
      operation: 'Intent evaluation',
      targetMs: 20,
      measuredMs: intentEvalMs,
      passed: intentEvalMs < 20
    });

    // 3. Recommendation Lookup Target: <100ms
    const recLookupBegin = Date.now();
    await queryService.getRecommendations('usr_bench_1', 'college_stanford_001', 10);
    const recLookupMs = Date.now() - recLookupBegin;
    results.push({
      operation: 'Recommendation lookup',
      targetMs: 100,
      measuredMs: recLookupMs,
      passed: recLookupMs < 100
    });

    // 4. Recommendation Generation Target: <150ms
    const recGenBegin = Date.now();
    const recEvt = buildEventEnvelope('IntentActivated', { intentId: 'int_bench_1', studentProfileId: 'usr_bench_1', intentType: 'STUDY_PARTNER' }, { collegeId: 'college_stanford_001' });
    await recWorker.processIntentActivated(recEvt);
    const recGenMs = Date.now() - recGenBegin;
    results.push({
      operation: 'Recommendation generation',
      targetMs: 150,
      measuredMs: recGenMs,
      passed: recGenMs < 150
    });

    // 5. Discovery Query Target: <80ms
    const discBegin = Date.now();
    await queryService.getDiscoveryFeed('college_stanford_001', undefined, 20, 1);
    const discMs = Date.now() - discBegin;
    results.push({
      operation: 'Discovery query',
      targetMs: 80,
      measuredMs: discMs,
      passed: discMs < 80
    });

    // 6. Notification Preparation Target: <30ms
    const notifBegin = Date.now();
    const notifEvt = buildEventEnvelope('NotificationQueued', { recipientId: 'usr_bench_1', title: 'Test', body: 'Body' }, { collegeId: 'college_stanford_001' });
    await notifWorker.processNotificationEvent(notifEvt);
    const notifMs = Date.now() - notifBegin;
    results.push({
      operation: 'Notification preparation',
      targetMs: 30,
      measuredMs: notifMs,
      passed: notifMs < 30
    });

    // 7. Cache Rebuild Target: <500ms
    const cacheRebuildBegin = Date.now();
    await cacheRecovery.rebuildAllCaches('college_stanford_001');
    const cacheRebuildMs = Date.now() - cacheRebuildBegin;
    results.push({
      operation: 'Cache rebuild',
      targetMs: 500,
      measuredMs: cacheRebuildMs,
      passed: cacheRebuildMs < 500
    });

    const allPassed = results.every((r) => r.passed);
    return {
      results,
      allPassed,
      executedAt: new Date().toISOString()
    };
  }
}
