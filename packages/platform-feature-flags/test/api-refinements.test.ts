import { describe, it, expect } from 'vitest';
import {
  checkApiVersion,
  RateLimiter,
  generateOpenApiSpec,
  ApplicationError,
  RequestLogger,
  buildRequestContext
} from '../src/index.js';

describe('Platform Feature Flags — API Refinements Suite', () => {

  it('1. Versioning Middleware: should return API version lifecycle details', () => {
    const v1 = checkApiVersion('v1');
    expect(v1.apiVersion).toBe('v1');
    expect(v1.isDeprecated).toBe(false);

    const v0 = checkApiVersion('v0');
    expect(v0.isDeprecated).toBe(true);
    expect(v0.sunsetDate).toBeDefined();
  });

  it('2. Rate Limiting Middleware: should throw 429 when threshold exceeded', () => {
    const limiter = new RateLimiter();
    const key = 'test_ip_101';

    // Allow 2 requests
    limiter.checkRateLimit(key, 2, 60000);
    limiter.checkRateLimit(key, 2, 60000);

    // Third request triggers Rate Limit Exceeded
    expect(() => limiter.checkRateLimit(key, 2, 60000)).toThrow(ApplicationError);
  });

  it('3. OpenAPI Spec Generator: should compile Zod endpoints into OpenAPI v3 schema', () => {
    const spec = generateOpenApiSpec();
    expect(spec.openapi).toBe('3.0.3');
    expect(spec.info.title).toContain('Platform Feature Management System');
    expect(spec.paths['/api/v1/feature-flags/evaluate']).toBeDefined();
  });

  it('4. Structured Logging with evaluationTraceId: should log evaluationTraceId', () => {
    const logger = new RequestLogger();
    const ctx = buildRequestContext({
      'x-request-id': 'req_99',
      'x-trace-id': 'trace_99'
    });

    const entry = logger.logRequest(ctx, 'POST', '/api/v1/feature-flags/evaluate', 200, 0.35, 'eval_trace_777');
    expect(entry.evaluationTraceId).toBe('eval_trace_777');
    expect(entry.requestId).toBe('req_99');
  });
});
