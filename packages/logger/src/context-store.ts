import { AsyncLocalStorage } from 'node:async_hooks';

export interface LogTraceContext {
  traceId?: string;
  tenantId?: string;
  userId?: string;
  moduleId?: string;
  serviceName?: string;
  spanId?: string;
  requestId?: string;
}

export class TraceContextStore {
  private static asyncLocalStorage = new AsyncLocalStorage<LogTraceContext>();

  public static run<R>(context: LogTraceContext, callback: () => R): R {
    return this.asyncLocalStorage.run(context, callback);
  }

  public static enterWith(context: LogTraceContext): void {
    this.asyncLocalStorage.enterWith(context);
  }

  public static getContext(): LogTraceContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  public static setTraceId(traceId: string): void {
    const store = this.asyncLocalStorage.getStore();
    if (store) {
      store.traceId = traceId;
    }
  }

  public static setTenantId(tenantId: string): void {
    const store = this.asyncLocalStorage.getStore();
    if (store) {
      store.tenantId = tenantId;
    }
  }

  public static setUserId(userId: string): void {
    const store = this.asyncLocalStorage.getStore();
    if (store) {
      store.userId = userId;
    }
  }

  public static setSpanId(spanId: string | undefined): void {
    const store = this.asyncLocalStorage.getStore();
    if (store) {
      if (spanId === undefined) {
        delete store.spanId;
      } else {
        store.spanId = spanId;
      }
    }
  }

  public static setRequestId(requestId: string | undefined): void {
    const store = this.asyncLocalStorage.getStore();
    if (store) {
      if (requestId === undefined) {
        delete store.requestId;
      } else {
        store.requestId = requestId;
      }
    }
  }

  public static setServiceName(serviceName: string): void {
    const store = this.asyncLocalStorage.getStore();
    if (store) {
      store.serviceName = serviceName;
    }
  }
}
