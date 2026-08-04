import { pino, type Logger, type LoggerOptions as PinoOptions } from 'pino';
import { PII_REDACTION_PATHS } from './redactor.js';
import { TraceContextStore, type LogTraceContext } from './context-store.js';

export interface LoggerConfig {
  level?: string;
  serviceName?: string;
  moduleId?: string;
  tenantId?: string;
}

export function createLogger(config: LoggerConfig = {}): Logger {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const serviceName = config.serviceName || 'college-hub-kernel';

  const pinoOptions: Record<string, unknown> = {
    level: config.level || process.env.LOG_LEVEL || 'info',
    name: serviceName,
    redact: {
      paths: PII_REDACTION_PATHS,
      censor: '[REDACTED]'
    },
    mixin() {
      const activeContext = TraceContextStore.getContext();
      return {
        environment: process.env.NODE_ENV || 'development',
        ...(config.moduleId ? { moduleId: config.moduleId } : {}),
        ...(config.tenantId ? { tenantId: config.tenantId } : {}),
        ...(activeContext?.traceId ? { traceId: activeContext.traceId } : {}),
        ...(activeContext?.tenantId ? { tenantId: activeContext.tenantId } : {}),
        ...(activeContext?.userId ? { userId: activeContext.userId } : {}),
        ...(activeContext?.spanId ? { spanId: activeContext.spanId } : {}),
        ...(activeContext?.requestId ? { requestId: activeContext.requestId } : {}),
        ...(activeContext?.serviceName ? { serviceName: activeContext.serviceName } : {})
      };
    }
  };

  if (isDevelopment && process.env.NODE_ENV !== 'test') {
    pinoOptions.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname'
      }
    };
  }

  return pino(pinoOptions as PinoOptions);
}

export function createChildLogger(parentLogger: Logger, context: Record<string, unknown>): Logger {
  return parentLogger.child(context);
}

export const logger = createLogger();

export * from './context-store.js';
export * from './redactor.js';
export type { Logger, LogTraceContext };
