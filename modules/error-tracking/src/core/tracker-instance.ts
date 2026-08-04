/**
 * Error Tracking & Incident Response — Process-wide Tracker Instance (MS-56)
 * A single tracker is bootstrapped by the API/worker processes when
 * ERROR_TRACKING_ENABLED is set. Other modules and plugins use the lazy
 * accessors so they never create a hard dependency at import time.
 */

import type { IErrorTransport } from '../domain/transport.interface.js';
import { ConsoleErrorTransport } from '../infrastructure/transports/console-transport.js';
import { StructuredLoggerErrorTransport } from '../infrastructure/transports/structured-logger-transport.js';
import { OTelErrorTransport } from '../infrastructure/transports/otel-transport.js';
import { ErrorTracker, type ErrorTrackerOptions } from './error-tracker.js';

let instance: ErrorTracker | undefined;

export function bootstrapErrorTracking(options: ErrorTrackerOptions): ErrorTracker {
  instance = new ErrorTracker(options);
  return instance;
}

export function getErrorTracker(): ErrorTracker {
  if (instance === undefined) {
    throw new Error(
      'Error tracking has not been bootstrapped. Call bootstrapErrorTracking() before using the error tracking API.'
    );
  }
  return instance;
}

export function tryGetErrorTracker(): ErrorTracker | undefined {
  return instance;
}

export function clearErrorTrackerInstance(): void {
  instance = undefined;
}

const TRANSPORT_FACTORIES: Record<string, () => IErrorTransport> = {
  console: () => new ConsoleErrorTransport(),
  structured: () => new StructuredLoggerErrorTransport(),
  otel: () => new OTelErrorTransport()
};

/**
 * Build the default transport set. Development defaults to the console +
 * structured logger providers; non-development defaults to the structured
 * logger + OpenTelemetry events providers. Override via ERROR_TRACKING_TRANSPORTS
 * (comma separated: console,structured,otel).
 */
export function createDefaultTransports(csv?: string | undefined): IErrorTransport[] {
  const raw =
    csv ??
    process.env.ERROR_TRACKING_TRANSPORTS ??
    (process.env.NODE_ENV === 'development' ? 'console,structured' : 'structured,otel');
  const names = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const transports: IErrorTransport[] = [];
  for (const name of names) {
    const factory = TRANSPORT_FACTORIES[name];
    if (factory !== undefined) {
      transports.push(factory());
    }
  }
  if (transports.length === 0) {
    transports.push(new StructuredLoggerErrorTransport());
  }
  return transports;
}
