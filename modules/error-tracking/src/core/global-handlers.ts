/**
 * Error Tracking & Incident Response — Global Process Handlers (MS-56)
 * Captures uncaught exceptions and unhandled promise rejections into the error
 * tracker. Returns a cleanup function so tests and runtime shutdowns can remove
 * the listeners without leaking state across suites.
 */

import { logger } from '@college-hub/logger';
import type { ErrorTracker } from './error-tracker.js';

export interface ProcessErrorHandlers {
  install(): void;
  dispose(): void;
}

export function installProcessErrorHandlers(tracker: ErrorTracker): ProcessErrorHandlers {
  const onUncaughtException = (error: Error): void => {
    tracker.handleException(error);
  };
  const onUnhandledRejection = (reason: unknown): void => {
    tracker.handleUnhandledRejection(reason);
  };

  process.on('uncaughtException', onUncaughtException);
  process.on('unhandledRejection', onUnhandledRejection);
  logger.info('Installed error tracking process handlers (uncaughtException / unhandledRejection)');

  return {
    install(): void {
      process.on('uncaughtException', onUncaughtException);
      process.on('unhandledRejection', onUnhandledRejection);
    },
    dispose(): void {
      process.off('uncaughtException', onUncaughtException);
      process.off('unhandledRejection', onUnhandledRejection);
    }
  };
}
