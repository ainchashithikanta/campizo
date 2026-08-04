import { describe, it, expect } from 'vitest';
import { MetricsRegistry, createMetricsRegistry } from '../src/registry.js';

describe('MetricsRegistry (MS-55)', () => {
  it('lazily creates a counter exactly once and reuses it', () => {
    const registry = new MetricsRegistry();
    const first = registry.counter('foo_total', 'Foo counter', ['kind']);
    const second = registry.counter('foo_total', 'Foo counter', ['kind']);
    expect(first).toBe(second);
    expect(registry.counterExists('foo_total')).toBe(true);
    expect(registry.hasMeter('foo_total')).toBe(true);
  });

  it('creates gauge, histogram and summary meters lazily', () => {
    const registry = new MetricsRegistry();
    registry.gauge('bar', 'Bar gauge', ['state']);
    registry.histogram('baz_seconds', 'Baz histogram', { buckets: [0.1, 0.5, 1] });
    registry.summary('qux', 'Qux summary', ['job']);
    expect(registry.hasMeter('bar')).toBe(true);
    expect(registry.hasMeter('baz_seconds')).toBe(true);
    expect(registry.hasMeter('qux')).toBe(true);
  });

  it('reports Prometheus text exposition format with content type', async () => {
    const registry = createMetricsRegistry({ serviceName: 'test-svc', environment: 'test' });
    const counter = registry.counter('reg_total', 'Registry counter', ['kind']);
    counter.inc({ kind: 'a' });
    counter.inc({ kind: 'b' });

    const text = await registry.metrics();
    expect(text).toContain('# HELP reg_total Registry counter');
    expect(text).toContain('# TYPE reg_total counter');
    expect(text).toContain('reg_total{kind="a",service="test-svc",environment="test"} 1');
    expect(text).toContain('reg_total{kind="b",service="test-svc",environment="test"} 1');
    expect(text).toContain('service="test-svc"');
    expect(text).toContain('environment="test"');
    expect(registry.contentType).toContain('text/plain');
  });

  it('configure() re-applies default labels at scrape time', async () => {
    const registry = createMetricsRegistry({ serviceName: 'old', environment: 'dev' });
    const counter = registry.counter('cfg_total', 'Config counter');
    counter.inc();

    registry.configure({ serviceName: 'new', environment: 'prod' });
    const text = await registry.metrics();
    expect(text).toContain('service="new"');
    expect(text).toContain('environment="prod"');
    expect(text).not.toContain('service="old"');
  });

  it('labels() returns a type-compatible label values object', () => {
    const registry = new MetricsRegistry();
    const counter = registry.counter('lbl_total', 'Labels counter', ['status']);
    const labels = registry.labels({ status: 200 });
    counter.inc(labels);
    expect(() => counter.inc(labels)).not.toThrow();
  });
});
