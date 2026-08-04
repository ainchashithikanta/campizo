/**
 * Structured Request Logger Middleware
 * Logs high-level request telemetry without exposing sensitive configuration, PII, or JWTs.
 */

import { RequestContext } from './request-context.js';

export interface StructuredLogEntry {
  requestId: string;
  traceId: string;
  evaluationTraceId?: string | undefined;
  endpoint: string;
  method: string;
  latencyMs: number;
  statusCode: number;
  collegeId: string;
  timestamp: string;
}

export class RequestLogger {
  private readonly logs: StructuredLogEntry[] = [];

  logRequest(
    ctx: RequestContext,
    method: string,
    endpoint: string,
    statusCode: number,
    latencyMs: number,
    evaluationTraceId?: string
  ): StructuredLogEntry {
    const entry: StructuredLogEntry = {
      requestId: ctx.requestId,
      traceId: ctx.traceId,
      evaluationTraceId,
      endpoint,
      method,
      latencyMs: Math.round(latencyMs * 100) / 100,
      statusCode,
      collegeId: ctx.collegeId,
      timestamp: new Date().toISOString()
    };

    this.logs.push(entry);
    return entry;
  }

  getLogs(): StructuredLogEntry[] {
    return [...this.logs];
  }
}
