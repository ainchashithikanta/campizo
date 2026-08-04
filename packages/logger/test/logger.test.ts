import { describe, it, expect } from 'vitest';
import { createLogger, createChildLogger, redactSensitiveObject, TraceContextStore } from '../src/index.js';

describe('Logger Package & Context Telemetry', () => {
  it('should initialize a structured logger instance', () => {
    const log = createLogger({ serviceName: 'test-service' });
    expect(log).toBeDefined();
    expect(typeof log.info).toBe('function');
  });

  it('should create child loggers with module and tenant context', () => {
    const parentLog = createLogger({ serviceName: 'kernel' });
    const childLog = createChildLogger(parentLog, { moduleId: 'rate-my-professor', tenantId: 'stanford-001' });
    expect(childLog).toBeDefined();
  });

  it('should redact sensitive PII properties in object payloads', () => {
    const payload = {
      username: 'student123',
      password: 'mySecretPassword123',
      nested: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        normalKey: 'public-data'
      }
    };

    const sanitized = redactSensitiveObject(payload);
    expect(sanitized.username).toBe('student123');
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.nested.token).toBe('[REDACTED]');
    expect(sanitized.nested.normalKey).toBe('public-data');
  });

  it('should enrich log entries transparently using TraceContextStore AsyncLocalStorage', () => {
    TraceContextStore.run({ traceId: 'tr-998877', tenantId: 'mit-002', userId: 'usr-123' }, () => {
      const activeContext = TraceContextStore.getContext();
      expect(activeContext?.traceId).toBe('tr-998877');
      expect(activeContext?.tenantId).toBe('mit-002');
      expect(activeContext?.userId).toBe('usr-123');
    });
  });

  it('mixin enriches pino output with requestId and serviceName from context (MS-55)', () => {
    const originalWrite = process.stdout.write.bind(process.stdout);
    const chunks: string[] = [];
    process.stdout.write = ((chunk: unknown) => {
      chunks.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;

    try {
      TraceContextStore.run({ requestId: 'req-abc-123', serviceName: 'api-gateway' }, () => {
        createLogger({ level: 'info' }).info('correlated log entry');
      });
    } finally {
      process.stdout.write = originalWrite;
    }

    const line = chunks.find((c) => c.includes('"msg":"correlated log entry"'));
    expect(line).toBeDefined();
    expect(line).toContain('"requestId":"req-abc-123"');
    expect(line).toContain('"serviceName":"api-gateway"');
  });

  it('setSpanId and setRequestId mutate only an active context (MS-55)', () => {
    TraceContextStore.run({ requestId: 'req-x' }, () => {
      TraceContextStore.setRequestId('req-y');
      TraceContextStore.setSpanId('span-1');
      const activeContext = TraceContextStore.getContext();
      expect(activeContext?.requestId).toBe('req-y');
      expect(activeContext?.spanId).toBe('span-1');

      TraceContextStore.setSpanId(undefined);
      expect(TraceContextStore.getContext()?.spanId).toBeUndefined();
    });
  });
});
