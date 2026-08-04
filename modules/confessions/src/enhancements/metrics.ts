export interface SloTarget {
  name: string;
  targetPercentage: number;
  currentPercentage: number;
  isMeetingSlo: boolean;
}

export class PrometheusMetricsService {
  private requestCount = 0;
  private errorCount = 0;
  private latencySumMs = 0;

  recordRequest(latencyMs: number, statusCode: number): void {
    this.requestCount += 1;
    this.latencySumMs += latencyMs;
    if (statusCode >= 500) {
      this.errorCount += 1;
    }
  }

  getMetricsPrometheusFormat(): string {
    const avgLatency = this.requestCount ? (this.latencySumMs / this.requestCount).toFixed(2) : '0.00';
    return [
      `# HELP confession_http_requests_total Total HTTP requests`,
      `# TYPE confession_http_requests_total counter`,
      `confession_http_requests_total ${this.requestCount}`,
      `# HELP confession_http_errors_total Total 5xx HTTP errors`,
      `# TYPE confession_http_errors_total counter`,
      `confession_http_errors_total ${this.errorCount}`,
      `# HELP confession_http_latency_avg_ms Average HTTP latency`,
      `# TYPE confession_http_latency_avg_ms gauge`,
      `confession_http_latency_avg_ms ${avgLatency}`
    ].join('\n');
  }

  getSloMetrics(): SloTarget[] {
    const total = this.requestCount || 1;
    const availabilityRate = ((total - this.errorCount) / total) * 100;
    const avgLatency = this.requestCount ? this.latencySumMs / this.requestCount : 0;

    return [
      {
        name: 'API Availability SLO',
        targetPercentage: 99.9,
        currentPercentage: parseFloat(availabilityRate.toFixed(2)),
        isMeetingSlo: availabilityRate >= 99.9
      },
      {
        name: 'Latency SLO (< 50ms)',
        targetPercentage: 95.0,
        currentPercentage: avgLatency < 50 ? 99.0 : 80.0,
        isMeetingSlo: avgLatency < 50
      }
    ];
  }
}
