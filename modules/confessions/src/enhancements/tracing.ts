export interface TraceSpan {
  spanId: string;
  traceId: string;
  name: string;
  attributes: Record<string, unknown>;
  startTime: number;
  endTime?: number;
}

export class DistributedTracer {
  private activeSpans = new Map<string, TraceSpan>();
  public completedSpans: TraceSpan[] = [];

  startSpan(
    name: string,
    traceId: string = `trace-${Date.now()}`,
    attributes: Record<string, unknown> = {}
  ): TraceSpan {
    const spanId = `span-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const span: TraceSpan = {
      spanId,
      traceId,
      name,
      attributes,
      startTime: Date.now()
    };
    this.activeSpans.set(spanId, span);
    return span;
  }

  endSpan(spanId: string, extraAttributes: Record<string, unknown> = {}): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.endTime = Date.now();
      span.attributes = { ...span.attributes, ...extraAttributes };
      this.completedSpans.push(span);
      this.activeSpans.delete(spanId);
    }
  }

  getCompletedSpans(): TraceSpan[] {
    return [...this.completedSpans];
  }
}
