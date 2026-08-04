# MS-56 — Developer Integration Guide

How to capture errors from your module or service and consume the error
tracking platform. The tracker is **optional and lazy**: code that references
`tryGetErrorTracker()` never crashes when error tracking is disabled.

## 1. Install the dependency

The module is published within the monorepo as `@college-hub/mod-error-tracking`.

```bash
pnpm --filter @college-hub/mod-your-module add @college-hub/mod-error-tracking
```

## 2. Capture an error (anywhere)

```ts
import { tryGetErrorTracker } from '@college-hub/mod-error-tracking';

try {
  await doWork();
} catch (err) {
  const tracker = tryGetErrorTracker();
  tracker?.capture({
    source: 'module', // or http/worker/database/redis/queue/...
    error: err,
    moduleId: 'your-module-id',
    tenantId: req.tenantId, // when available
    userId: req.user?.id, // when available
    requestId: req.requestId,
    traceId: req.traceId,
    spanId: req.spanId,
    route: req.route,
    method: req.method,
    statusCode: 500,
    attributes: { correlation: 'extra' }
  });
  throw err; // always rethrow unless handled upstream
}
```

Optional chaining (`tracker?.`) guarantees zero coupling when the module is
disabled.

### Dedicated helpers

```ts
tracker.handleException(err); // source: unhandled
tracker.handleUnhandledRejection(reason); // source: unhandledrejection
tracker.captureRequestError(err, { requestId, traceId, tenantId, userId, route, method, statusCode }); // source: http
tracker.recordDependencyFailure('database', err); // or redis | queue | health
```

### Capturing inside a traced span

```ts
const result = await tracker.captureWithSpan(
  'your-module.operation',
  { source: 'module', moduleId: 'your-module-id' },
  async () => expensiveOperation()
);
// failures are captured AND rethrown automatically
```

## 3. Bootstrap the tracker (process entry points only)

Only the process that owns the runtime (API server, worker) bootstraps:

```ts
import {
  bootstrapErrorTracking,
  installProcessErrorHandlers,
  createDefaultTransports,
  InMemoryErrorTrackingRepository
} from '@college-hub/mod-error-tracking';

if (process.env.ERROR_TRACKING_ENABLED === 'true') {
  const tracker = bootstrapErrorTracking({
    serviceName: process.env.SERVICE_NAME ?? 'college-hub',
    dedupeWindowMs: Number(process.env.ERROR_TRACKING_DEDUPE_WINDOW_MS ?? 86_400_000),
    transports: createDefaultTransports(), // ERROR_TRACKING_TRANSPORTS csv
    repository: new InMemoryErrorTrackingRepository()
  });
  installProcessErrorHandlers(tracker); // uncaughtException / rejection
}
```

On shutdown: dispose process handlers and call `clearErrorTrackerInstance()`.

## 4. Register routes (API process)

```ts
import { ErrorTrackingModule } from '@college-hub/mod-error-tracking';

moduleRegistry.register(new ErrorTrackingModule({ tracker }));
await moduleRegistry.initializeAll(app, eventBus);
```

The module also subscribes to the `error.tracked` event bus topic, so other
modules can publish captures without importing the tracker:

```ts
eventBus.publish('error.tracked', { source: 'module', error: err, moduleId: 'x' });
```

## 5. Environment configuration

| Variable                          | Defaults                                               | Meaning                        |
| --------------------------------- | ------------------------------------------------------ | ------------------------------ |
| `ERROR_TRACKING_ENABLED`          | `false` (must equal `"true"`)                          | Enable capture + routes        |
| `ERROR_TRACKING_DEDUPE_WINDOW_MS` | `86400000`                                             | Aggregation window (ms)        |
| `ERROR_TRACKING_TRANSPORTS`       | `console,structured` (dev) / `structured,otel` (other) | Comma-separated provider names |

Helm exposes these via the `errorTracking` values section (see
`infra/helm/collegehub/values.yaml`).

## 6. Adding a new provider (Sentry / self-hosted)

Implement the provider contract and register it:

```ts
import type { IErrorTransport, TrackedErrorEntity } from '@college-hub/mod-error-tracking';

export class SentryErrorTransport implements IErrorTransport {
  public readonly name = 'sentry';
  public report(error: TrackedErrorEntity): void {
    // send to Sentry, mapping fields -> Sentry event
  }
}

// wire-up
bootstrapErrorTracking({
  transports: [new SentryErrorTransport(), ...createDefaultTransports()]
  // ...
});
```

No changes to the tracker core, the API routes, the console or the repository
are required. Add the transport name to `TRANSPORT_FACTORIES` in
`tracker-instance.ts` to make it selectable via `ERROR_TRACKING_TRANSPORTS`.

## 7. Consuming data

- **Console**: `/admin/error-tracking` (dashboard), `/errors`, `/incidents`,
  `/incidents/[id]` (lifecycle updates), `/runbooks`.
- **REST**: see `docs/api/MS-56-ERROR_TRACKING_API.md`.
- **Prometheus**: `collegehub_error_tracking_errors_total`,
  `collegehub_error_tracking_incidents_total`.
- **Runbooks**: `docs/runbooks/` (7 operator runbooks).
