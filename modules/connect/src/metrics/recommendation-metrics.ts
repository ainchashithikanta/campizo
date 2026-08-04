/**
 * Campus Connect — Recommendation Metrics Collector
 * Collects recommendation generation latency, throughput, snapshot creation counts, and cache hit ratios.
 * NO PII OR INDIVIDUAL USER IDENTIFIERS ARE STORED.
 */

export interface RecommendationMetricSummary {
  totalGenerations: number;
  avgDurationMs: number;
  p95DurationMs: number;
  cacheHitRatioPct: number;
  totalSnapshotsCreated: number;
}

export class RecommendationMetricsCollector {
  private durations: number[] = [];
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private snapshotsCreated: number = 0;

  recordGeneration(durationMs: number, cacheHit: boolean): void {
    this.durations.push(durationMs);
    if (cacheHit) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }
    this.snapshotsCreated++;

    if (this.durations.length > 1000) {
      this.durations.shift();
    }
  }

  getSummary(): RecommendationMetricSummary {
    const sorted = [...this.durations].sort((a, b) => a - b);
    const avg = sorted.length > 0 ? sorted.reduce((sum, v) => sum + v, 0) / sorted.length : 0;
    const p95Idx = Math.floor(sorted.length * 0.95);
    const p95 = sorted.length > 0 ? sorted[p95Idx] || sorted[sorted.length - 1]! : 0;
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRatio = totalRequests > 0 ? (this.cacheHits / totalRequests) * 100 : 0;

    return {
      totalGenerations: this.durations.length,
      avgDurationMs: Math.round(avg * 100) / 100,
      p95DurationMs: Math.round(p95 * 100) / 100,
      cacheHitRatioPct: Math.round(hitRatio * 100) / 100,
      totalSnapshotsCreated: this.snapshotsCreated
    };
  }

  reset(): void {
    this.durations = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.snapshotsCreated = 0;
  }
}
