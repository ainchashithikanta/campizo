import { pino, type Logger, type LoggerOptions as PinoOptions, multistream, type Level } from 'pino';
import { PII_REDACTION_PATHS } from './redactor.js';
import { TraceContextStore, type LogTraceContext } from './context-store.js';
import { createBetterStackStream } from './betterstack-transport.js';

export interface LoggerConfig {
  level?: string;
  serviceName?: string;
  moduleId?: string;
  tenantId?: string;
  betterStackToken?: string;
  betterStackHost?: string;
}

export function createLogger(config: LoggerConfig = {}): Logger {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const serviceName = config.serviceName || process.env.SERVICE_NAME || 'college-hub-kernel';
  const logLevel = (config.level || process.env.LOG_LEVEL || 'info') as Level;

  const pinoOptions: Record<string, unknown> = {
    level: logLevel,
    name: serviceName,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label: string, number: number) {
        return { level: label, levelValue: number };
      }
    },
    redact: {
      paths: PII_REDACTION_PATHS,
      censor: '[REDACTED]'
    },
    mixin() {
      const activeContext = TraceContextStore.getContext();
      return {
        environment: process.env.NODE_ENV || 'development',
        serviceName,
        timestamp: new Date().toISOString(),
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

  const bsStream = createBetterStackStream({
    sourceToken: config.betterStackToken || process.env.BETTERSTACK_SOURCE_TOKEN || undefined,
    ingestingHost: config.betterStackHost || process.env.BETTERSTACK_INGESTING_HOST || undefined
  });

  if (isDevelopment && process.env.NODE_ENV !== 'test') {
    pinoOptions.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname'
      }
    };

    if (bsStream) {
      const loggerInstance = pino(pinoOptions as PinoOptions, multistream([{ stream: bsStream, level: logLevel }]));
      return loggerInstance;
    }

    return pino(pinoOptions as PinoOptions);
  }

  if (bsStream) {
    const streams = [
      { stream: process.stdout, level: logLevel },
      { stream: bsStream, level: logLevel }
    ];
    return pino(pinoOptions as PinoOptions, multistream(streams));
  }

  return pino(pinoOptions as PinoOptions);
}

export function createChildLogger(parentLogger: Logger, context: Record<string, unknown>): Logger {
  return parentLogger.child(context);
}

export function setupProcessErrorHandler(instanceLogger: Logger = logger): void {
  process.on('uncaughtException', (err: Error) => {
    instanceLogger.fatal({ err, stack: err.stack }, `Uncaught Exception: ${err.message}`);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    instanceLogger.error({ err, stack: err.stack }, `Unhandled Rejection: ${err.message}`);
  });
}

export const logger = createLogger();

export * from './context-store.js';
export * from './redactor.js';
export * from './betterstack-transport.js';
export type { Logger, LogTraceContext };
