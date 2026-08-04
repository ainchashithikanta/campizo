import { describe, it, expect, beforeEach } from 'vitest';
import {
  FeatureEvaluationService,
  PerformanceBenchmark,
  WorkerMetricsCollector,
  EvaluationMetricsCollector,
  SystemMetricsCollector
} from '../src/index.js';

describe('Platform Feature Flags — Performance Benchmark & Telemetry Verification', () => {
  let evalService: FeatureEvaluationService;
  let benchmark: PerformanceBenchmark;
  let workerCollector: WorkerMetricsCollector;
  let evalCollector: EvaluationMetricsCollector;
  let systemCollector: SystemMetricsCollector;

  beforeEach(() => {
    evalService = new FeatureEvaluationService();
    benchmark = new PerformanceBenchmark(evalService);
    workerCollector = new WorkerMetricsCollector();
    evalCollector = new EvaluationMetricsCollector();
    systemCollector = new SystemMetricsCollector();
  });

  it('1. Performance Benchmark: verify sub-millisecond evaluation SLA and target latencies', () => {
    const report = benchmark.runBenchmark(5000);

    expect(report.avgEvaluationLatencyMs).toBeLessThan(1.0);
    expect(report.cacheRefreshLatencyMs).toBeLessThan(50.0);
    expect(report.killSwitchPropagationMs).toBeLessThan(100.0);
    expect(report.snapshotRestoreSeconds).toBeLessThan(2.0);
    expect(report.meetsSLA).toBe(true);
  });

  it('2. Telemetry Collectors: verify worker, evaluation, and system metric accumulation', () => {
    workerCollector.recordWorkerExecution('ConfigurationWorker', 1.2, true);
    workerCollector.recordWorkerExecution('ConfigurationWorker', 1.5, true);

    const workerSnapshots = workerCollector.getSnapshots();
    expect(workerSnapshots.length).toBe(1);
    expect(workerSnapshots[0]?.processedCount).toBe(2);

    evalCollector.recordEvaluation(0.12, true);
    evalCollector.recordEvaluation(0.15, true);
    const evalSummary = evalCollector.getSummary();
    expect(evalSummary.totalEvaluations).toBe(2);
    expect(evalSummary.cacheHitRatioPercent).toBe(100);

    const sysSummary = systemCollector.getSummary();
    expect(sysSummary.memoryUsageMb).toBeGreaterThan(0);
  });
});
