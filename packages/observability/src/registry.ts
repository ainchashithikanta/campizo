/**
 * College Hub Observability Platform — Metrics Registry (MS-55)
 * Lazy-initialized, single-registry meter factory. Every named metric is created
 * exactly once and reused, guaranteeing no duplicate meter registration.
 */

import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  Summary,
  collectDefaultMetrics,
  type HistogramConfiguration,
  type LabelValues
} from 'prom-client';

export interface MetricsRegistryOptions {
  serviceName?: string;
  environment?: string;
  collectProcessMetrics?: boolean;
}

export interface HistogramOptions {
  buckets?: number[];
  labelNames?: string[];
}

export class MetricsRegistry {
  private readonly registry = new Registry();
  private readonly counters = new Map<string, Counter<string>>();
  private readonly gauges = new Map<string, Gauge<string>>();
  private readonly histograms = new Map<string, Histogram<string>>();
  private readonly summaries = new Map<string, Summary<string>>();

  constructor(options: MetricsRegistryOptions = {}) {
    const defaultLabels: Record<string, string> = {};
    if (options.serviceName !== undefined) defaultLabels.service = options.serviceName;
    if (options.environment !== undefined) defaultLabels.environment = options.environment;
    if (Object.keys(defaultLabels).length > 0) {
      this.registry.setDefaultLabels(defaultLabels);
    }
    if (options.collectProcessMetrics === true) {
      collectDefaultMetrics({ register: this.registry });
    }
  }

  /** Get (and lazily create) a counter. Reuses the existing meter when the name is known. */
  public counter(name: string, help: string, labelNames: string[] = []): Counter<string> {
    let metric = this.counters.get(name);
    if (metric === undefined) {
      metric = new Counter({ name, help, labelNames, registers: [this.registry] });
      this.counters.set(name, metric);
    }
    return metric;
  }

  /** Get (and lazily create) a gauge. Reuses the existing meter when the name is known. */
  public gauge(name: string, help: string, labelNames: string[] = []): Gauge<string> {
    let metric = this.gauges.get(name);
    if (metric === undefined) {
      metric = new Gauge({ name, help, labelNames, registers: [this.registry] });
      this.gauges.set(name, metric);
    }
    return metric;
  }

  /** Get (and lazily create) a histogram. Reuses the existing meter when the name is known. */
  public histogram(name: string, help: string, options: HistogramOptions = {}): Histogram<string> {
    let metric = this.histograms.get(name);
    if (metric === undefined) {
      const config: HistogramConfiguration<string> = {
        name,
        help,
        labelNames: options.labelNames ?? [],
        registers: [this.registry]
      };
      if (options.buckets !== undefined) {
        config.buckets = options.buckets;
      }
      metric = new Histogram(config);
      this.histograms.set(name, metric);
    }
    return metric;
  }

  /** Get (and lazily create) a summary. Reuses the existing meter when the name is known. */
  public summary(name: string, help: string, labelNames: string[] = []): Summary<string> {
    let metric = this.summaries.get(name);
    if (metric === undefined) {
      metric = new Summary({ name, help, labelNames, registers: [this.registry] });
      this.summaries.set(name, metric);
    }
    return metric;
  }

  /** Update default labels (service / environment). Applies to all meters at scrape time. */
  public configure(options: { serviceName?: string; environment?: string }): void {
    const defaultLabels: Record<string, string> = {};
    if (options.serviceName !== undefined) defaultLabels.service = options.serviceName;
    if (options.environment !== undefined) defaultLabels.environment = options.environment;
    if (Object.keys(defaultLabels).length > 0) {
      this.registry.setDefaultLabels(defaultLabels);
    }
  }

  public counterExists(name: string): boolean {
    return this.counters.has(name);
  }

  public hasMeter(name: string): boolean {
    return this.counters.has(name) || this.gauges.has(name) || this.histograms.has(name) || this.summaries.has(name);
  }

  /** Serialize all metrics in Prometheus text exposition format. */
  public async metrics(): Promise<string> {
    return this.registry.metrics();
  }

  public get contentType(): string {
    return this.registry.contentType;
  }

  public labels(values: Record<string, string | number>): LabelValues<string> {
    return values as LabelValues<string>;
  }
}

export function createMetricsRegistry(options: MetricsRegistryOptions = {}): MetricsRegistry {
  return new MetricsRegistry(options);
}

export type { LabelValues };
