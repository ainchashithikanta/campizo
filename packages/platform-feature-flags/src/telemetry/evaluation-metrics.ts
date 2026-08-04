/**
 * Evaluation Metrics Telemetry Collector
 */

export interface EvaluationMetricSummary {
  totalEvaluations: number;
  cacheHitRatioPercent: number;
  avgLatencyMs: number;
}

export class EvaluationMetricsCollector {
  private totalCount: number = 0;
  private cacheHits: number = 0;
  private totalDurationMs: number = 0;

  recordEvaluation(durationMs: number, cacheHit: boolean): void {
    this.totalCount++;
    if (cacheHit) this.cacheHits++;
    this.totalDurationMs += durationMs;
  }

  getSummary(): EvaluationMetricSummary {
    return {
      totalEvaluations: this.totalCount,
      cacheHitRatioPercent: this.totalCount > 0 ? Math.round((this.cacheHits / this.totalCount) * 10000) / 100 : 100,
      avgLatencyMs: this.totalCount > 0 ? Math.round((this.totalDurationMs / this.totalCount) * 1000) / 1000 : 0
    };
  }
}
