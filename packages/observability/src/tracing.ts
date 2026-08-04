/**
 * OpenTelemetry tracing bootstrap + span helpers (MS-55).
 *
 * Tracing is opt-in via `OTEL_TRACES_ENABLED=true` (set in staging/production by
 * the Helm chart). When disabled every helper degrades to a lightweight no-op so
 * the rest of the codebase can call them unconditionally.
 *
 * Log correlation: every span start/end bridges traceId/spanId into
 * TraceContextStore (AsyncLocalStorage) so pino structured logs from within a
 * span carry matching trace ids.
 */

import {
  context,
  isSpanContextValid,
  propagation,
  trace,
  SpanStatusCode,
  type Attributes,
  type Context,
  type Exception,
  type Span,
  type SpanOptions
} from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { TraceContextStore, type LogTraceContext } from '@college-hub/logger';

let sdk: NodeSDK | null = null;
let enabled = false;
let activeServiceName = 'college-hub';

export interface TracingOptions {
  enabled?: boolean;
  serviceName?: string;
  serviceVersion?: string;
  environment?: string;
  endpoint?: string;
  headers?: Record<string, string>;
}

export function isTracingEnabled(): boolean {
  return enabled;
}

export function initTracing(options: TracingOptions = {}): boolean {
  if (sdk !== null) {
    return true;
  }
  const optedIn = options.enabled ?? process.env.OTEL_TRACES_ENABLED === 'true';
  if (optedIn !== true) {
    return false;
  }

  const serviceName = options.serviceName ?? process.env.SERVICE_NAME ?? 'college-hub';
  activeServiceName = serviceName;

  const resourceAttributes: Attributes = { [ATTR_SERVICE_NAME]: serviceName };
  if (options.serviceVersion !== undefined) {
    resourceAttributes[ATTR_SERVICE_VERSION] = options.serviceVersion;
  }
  if (options.environment !== undefined) {
    resourceAttributes['deployment.environment'] = options.environment;
  }

  const endpoint = options.endpoint ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/traces';
  const exporterConfig: { url: string; headers?: Record<string, string> } = { url: endpoint };
  const headers = options.headers;
  if (headers !== undefined && Object.keys(headers).length > 0) {
    exporterConfig.headers = headers;
  }

  sdk = new NodeSDK({
    resource: resourceFromAttributes(resourceAttributes),
    serviceName,
    traceExporter: new OTLPTraceExporter(exporterConfig)
  });
  sdk.start();
  enabled = true;
  return true;
}

export async function shutdownTracing(): Promise<void> {
  if (sdk !== null) {
    await sdk.shutdown();
    sdk = null;
    enabled = false;
  }
}

function getTracer() {
  return trace.getTracer(activeServiceName);
}

/** Extract a remote parent context from an incoming headers map (W3C traceparent propagation). */
export function extractTraceContext(headers: Record<string, unknown> | undefined): Context {
  if (headers === undefined) {
    return context.active();
  }
  return propagation.extract(context.active(), headers);
}

export interface SpanHandle {
  readonly span: Span;
  end(status?: 'ok' | 'error', attributes?: Attributes): void;
  recordException(error: unknown): void;
  setStatus(status: 'ok' | 'error'): void;
}

export interface StartSpanOptions {
  attributes?: Attributes;
  parent?: Context;
}

export function startSpan(name: string, options?: StartSpanOptions): SpanHandle {
  const spanOptions: SpanOptions = {};
  if (options !== undefined && options.attributes !== undefined) {
    spanOptions.attributes = options.attributes;
  }
  const span = getTracer().startSpan(name, spanOptions, options?.parent);
  bridgeLogContext(span);
  return createSpanHandle(span);
}

function createSpanHandle(span: Span): SpanHandle {
  return {
    span,
    end(status?: 'ok' | 'error', attributes?: Attributes): void {
      if (status === 'ok') {
        span.setStatus({ code: SpanStatusCode.OK });
      } else if (status === 'error') {
        span.setStatus({ code: SpanStatusCode.ERROR });
      }
      if (attributes !== undefined) {
        span.setAttributes(attributes);
      }
      span.end();
      restoreLogContext();
    },
    recordException(error: unknown): void {
      const exception: Exception = error instanceof Error ? error : new Error(String(error));
      span.recordException(exception);
    },
    setStatus(status: 'ok' | 'error'): void {
      span.setStatus({ code: status === 'ok' ? SpanStatusCode.OK : SpanStatusCode.ERROR });
    }
  };
}

/**
 * Run an async function inside a new span, propagating OTel context (so nested
 * spans auto-parent) and bridging trace/span ids into the logging context.
 */
export async function runInSpan<T>(
  name: string,
  options: StartSpanOptions | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const spanOptions: SpanOptions = {};
  if (options !== undefined && options.attributes !== undefined) {
    spanOptions.attributes = options.attributes;
  }
  const span = getTracer().startSpan(name, spanOptions, options?.parent);
  const activeCtx = trace.setSpan(context.active(), span);
  const logContext = buildLogContext(span);

  try {
    return await TraceContextStore.run(logContext, () => context.with(activeCtx, () => fn()));
  } catch (error) {
    const exception: Exception = error instanceof Error ? error : new Error(String(error));
    span.recordException(exception);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
}

function buildLogContext(span: Span): LogTraceContext {
  const previous = TraceContextStore.getContext();
  const sc = span.spanContext();
  return {
    ...(previous ?? {}),
    ...(isSpanContextValid(sc) ? { traceId: sc.traceId, spanId: sc.spanId } : {})
  };
}

function bridgeLogContext(span: Span): void {
  const previous = TraceContextStore.getContext();
  const sc = span.spanContext();
  const next: LogTraceContext = {
    ...(previous ?? {}),
    ...(isSpanContextValid(sc) ? { traceId: sc.traceId, spanId: sc.spanId } : {})
  };
  TraceContextStore.enterWith(next);
}

function restoreLogContext(): void {
  const previous = TraceContextStore.getContext();
  const restored: LogTraceContext = previous ?? {};
  delete restored.spanId;
  TraceContextStore.enterWith(restored);
}
