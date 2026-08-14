import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { TraceContextStore } from '@college-hub/logger';
import {
  observability,
  startSpan,
  extractTraceContext,
  isTracingEnabled,
  ATTR_HTTP_REQUEST_METHOD,
  ATTR_HTTP_RESPONSE_STATUS_CODE,
  ATTR_HTTP_ROUTE,
  type SpanHandle
} from '@college-hub/observability';

interface RequestObservabilityState {
  excluded: boolean;
  method: string;
  route: string;
  bytes: number;
  span?: SpanHandle;
}

const requestState = new WeakMap<FastifyRequest, RequestObservabilityState>();

function isMetricsEnabled(): boolean {
  return process.env.METRICS_ENABLED !== 'false';
}

async function observabilityPluginFn(fastify: FastifyInstance): Promise<void> {
  const metricsEnabled = isMetricsEnabled();

  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    const route = request.routerPath || 'unmatched';
    const method = request.method;
    const excluded = metricsEnabled && route === '/metrics';

    const state: RequestObservabilityState = { excluded, method, route, bytes: 0 };
    requestState.set(request, state);

    if (excluded || !metricsEnabled) {
      return;
    }

    observability.http.requestStarted(method, route);

    if (isTracingEnabled()) {
      const parent = extractTraceContext(request.headers);
      const span = startSpan(`HTTP ${method} ${route}`, {
        parent,
        attributes: {
          [ATTR_HTTP_REQUEST_METHOD]: method,
          [ATTR_HTTP_ROUTE]: route
        }
      });
      state.span = span;
      TraceContextStore.setSpanId(span.span.spanContext().spanId);
    }
  });

  fastify.addHook('onSend', async (request: FastifyRequest, _reply: FastifyReply, payload: unknown) => {
    const state = requestState.get(request);
    if (state === undefined || state.excluded) {
      return;
    }
    if (typeof payload === 'string') {
      state.bytes += Buffer.byteLength(payload);
    } else if (Buffer.isBuffer(payload)) {
      state.bytes += payload.length;
    }
  });

  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const state = requestState.get(request);
    if (state === undefined) {
      return;
    }

    const statusCode = reply.statusCode;
    const durationMs = reply.elapsedTime;

    if (metricsEnabled && !state.excluded) {
      observability.http.requestFinished(
        state.method,
        state.route,
        statusCode,
        durationMs,
        state.bytes > 0 ? state.bytes : undefined
      );
    }

    const span = state.span;
    if (span !== undefined) {
      span.end(statusCode >= 500 ? 'error' : 'ok', {
        [ATTR_HTTP_RESPONSE_STATUS_CODE]: statusCode,
        'http.response.body.size': state.bytes
      });
      TraceContextStore.setSpanId(undefined);
    }
  });

  if (metricsEnabled) {
    fastify.get('/metrics', async (request, reply) => {
      const token = process.env.METRICS_TOKEN;
      if (token) {
        const auth = (request.headers['authorization'] as string) || '';
        const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
        if (!provided || provided !== token) {
          reply.code(401);
          return { error: 'Unauthorized' };
        }
      } else if (process.env.NODE_ENV === 'production') {
        // Fail closed: /metrics must not be publicly exposed in production
        // without an explicit METRICS_TOKEN.
        reply.code(503);
        return { error: 'Metrics endpoint is not configured' };
      }
      reply.header('content-type', observability.registry.contentType);
      return await observability.registry.metrics();
    });
  }
}

export const observabilityPlugin = fp(observabilityPluginFn, {
  name: 'observability-plugin'
});
