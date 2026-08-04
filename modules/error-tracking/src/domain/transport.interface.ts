/**
 * Error Tracking & Incident Response — Transport Interface (MS-56)
 * Provider abstraction for error reporting. Providers are pluggable: console
 * (dev), structured logger, OpenTelemetry events today; Sentry and self-hosted
 * collectors can be added later without touching the tracker core.
 */

import type { TrackedErrorEntity } from './entities.js';

export interface IErrorTransport {
  readonly name: string;
  report(error: TrackedErrorEntity): void;
}
