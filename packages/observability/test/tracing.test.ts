import { describe, it, expect, afterEach } from 'vitest';
import { TraceContextStore } from '@college-hub/logger';
import {
  initTracing,
  shutdownTracing,
  isTracingEnabled,
  startSpan,
  runInSpan,
  extractTraceContext
} from '../src/tracing.js';

describe('Tracing bootstrap + helpers (MS-55)', () => {
  afterEach(async () => {
    delete process.env.OTEL_TRACES_ENABLED;
    await shutdownTracing();
  });

  it('is disabled by default when OTEL_TRACES_ENABLED is not set', () => {
    expect(initTracing()).toBe(false);
    expect(isTracingEnabled()).toBe(false);
  });

  it('stays disabled when explicitly disabled even with env set to true', () => {
    process.env.OTEL_TRACES_ENABLED = 'true';
    expect(initTracing({ enabled: false })).toBe(false);
    expect(isTracingEnabled()).toBe(false);
  });

  it('extractTraceContext returns active context for undefined headers', () => {
    expect(() => extractTraceContext(undefined)).not.toThrow();
  });

  it('runInSpan executes the callback and returns its value (no-op without SDK)', async () => {
    const result = await runInSpan('op', { attributes: { 'job.name': 'x' } }, async () => 'done');
    expect(result).toBe('done');
  });

  it('runInSpan rethrows callback errors', async () => {
    await expect(
      runInSpan('failing', undefined, async () => {
        throw new Error('nope');
      })
    ).rejects.toThrow('nope');
  });

  it('startSpan returns a handle whose end() is safe without an SDK', () => {
    const handle = startSpan('op', { attributes: { 'job.name': 'x' } });
    expect(() => handle.end('ok')).not.toThrow();
  });

  it('runInSpan isolates the TraceContextStore across concurrent executions', async () => {
    const results = await TraceContextStore.run({ requestId: 'outer' }, async () =>
      Promise.all([
        runInSpan('a', undefined, async () => TraceContextStore.getContext()?.requestId),
        runInSpan('b', undefined, async () => TraceContextStore.getContext()?.requestId)
      ])
    );
    expect(results).toEqual(['outer', 'outer']);
  });
});
