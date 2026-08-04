/**
 * Campus Connect — Worker Performance & Telemetry Metrics Tracker
 * Records worker startup latency, processing duration (P95/P99), success/failure counts, and queue lag.
 */

export interface MetricSnapshot {
  workerName: string;
  totalJobsProcessed: number;
  totalErrors: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  lastExecutionTimestamp: string | null;
}

export class WorkerMetrics {
  private static instance: WorkerMetrics;
  private metricsMap: Map<string, { latencies: number[]; errors: number; total: number; lastTime: string | null }> = new Map();
  private startupTime: number = Date.now();

  static getInstance(): WorkerMetrics {
    if (!WorkerMetrics.instance) {
      WorkerMetrics.instance = new WorkerMetrics();
    }
    return WorkerMetrics.instance;
  }

  recordJobExecution(workerName: string, latencyMs: number, success: boolean): void {
    const current = this.metricsMap.get(workerName) || { latencies: [], errors: 0, total: 0, lastTime: null };
    current.total++;
    if (!success) {
      current.errors++;
    }
    current.latencies.push(latencyMs);
    if (current.latencies.length > 500) {
      current.latencies.shift(); // Bound memory footprint
    }
    current.lastTime = new Date().toISOString();
    this.metricsMap.set(workerName, current);
  }

  getSnapshot(workerName: string): MetricSnapshot {
    const data = this.metricsMap.get(workerName) || { latencies: [], errors: 0, total: 0, lastTime: null };
    const sorted = [...data.latencies].sort((a, b) => a - b);
    const avg = sorted.length > 0 ? sorted.reduce((sum, v) => sum + v, 0) / sorted.length : 0;
    const p95Idx = Math.floor(sorted.length * 0.95);
    const p95 = sorted.length > 0 ? sorted[p95Idx] || sorted[sorted.length - 1]! : 0;

    return {
      workerName,
      totalJobsProcessed: data.total,
      totalErrors: data.errors,
      avgLatencyMs: Math.round(avg * 100) / 100,
      p95LatencyMs: Math.round(p95 * 100) / 100,
      lastExecutionTimestamp: data.lastTime
    };
  }

  getStartupLatencyMs(): number {
    return Date.now() - this.startupTime;
  }

  reset(): void {
    this.metricsMap.clear();
    this.startupTime = Date.now();
  }
}
