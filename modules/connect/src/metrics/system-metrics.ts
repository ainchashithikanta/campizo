/**
 * Campus Connect — System Metrics Collector
 * Collects throughput, latency, retries, failures, DLQ count, replay count, and queue depth across the module.
 * STRICTLY NO PII STORED.
 */

export interface SystemMetricsReport {
  throughputRps: number;
  avgLatencyMs: number;
  totalRetries: number;
  totalFailures: number;
  dlqCount: number;
  replayCount: number;
  queueDepth: number;
  timestamp: string;
}

export class SystemMetricsCollector {
  private totalRequests: number = 0;
  private totalLatenciesMs: number = 0;
  private retries: number = 0;
  private failures: number = 0;
  private dlqCount: number = 0;
  private replayCount: number = 0;

  recordRequest(latencyMs: number, success: boolean): void {
    this.totalRequests++;
    this.totalLatenciesMs += latencyMs;
    if (!success) {
      this.failures++;
    }
  }

  recordRetry(): void {
    this.retries++;
  }

  recordDLQEntry(): void {
    this.dlqCount++;
  }

  recordReplay(): void {
    this.replayCount++;
  }

  getReport(): SystemMetricsReport {
    const avgLatency = this.totalRequests > 0 ? this.totalLatenciesMs / this.totalRequests : 0;
    return {
      throughputRps: this.totalRequests,
      avgLatencyMs: Math.round(avgLatency * 100) / 100,
      totalRetries: this.retries,
      totalFailures: this.failures,
      dlqCount: this.dlqCount,
      replayCount: this.replayCount,
      queueDepth: 0,
      timestamp: new Date().toISOString()
    };
  }

  reset(): void {
    this.totalRequests = 0;
    this.totalLatenciesMs = 0;
    this.retries = 0;
    this.failures = 0;
    this.dlqCount = 0;
    this.replayCount = 0;
  }
}
