/**
 * Worker Metrics Telemetry Collector
 */

export interface WorkerMetricSnapshot {
  workerName: string;
  processedCount: number;
  failureCount: number;
  avgLatencyMs: number;
}

export class WorkerMetricsCollector {
  private readonly metrics: Map<string, { processed: number; failures: number; totalMs: number }> = new Map();

  recordWorkerExecution(workerName: string, durationMs: number, success: boolean): void {
    const current = this.metrics.get(workerName) || { processed: 0, failures: 0, totalMs: 0 };
    current.processed += 1;
    if (!success) current.failures += 1;
    current.totalMs += durationMs;
    this.metrics.set(workerName, current);
  }

  getSnapshots(): WorkerMetricSnapshot[] {
    const list: WorkerMetricSnapshot[] = [];
    for (const [name, data] of this.metrics.entries()) {
      list.push({
        workerName: name,
        processedCount: data.processed,
        failureCount: data.failures,
        avgLatencyMs: data.processed > 0 ? Math.round((data.totalMs / data.processed) * 100) / 100 : 0
      });
    }
    return list;
  }
}
