# College Hub: Logging, Observability & Telemetry Standards (MS-04)

## Document Overview

- **Project**: College Hub (Enterprise Multi-College Platform)
- **Document Title**: Structured Logging & Telemetry Specification
- **Document Version**: 1.0.0-FINAL
- **Package Reference**: `@college-hub/logger`
- **Status**: Official Engineering Standard (MS-04 Complete)

---

## 1. Structured JSON Log Specification

All application logs produced across API servers, background queue workers, and micro-kernel services format as single-line JSON objects adhering to standard OpenTelemetry semantic conventions.

### Standard JSON Log Envelope

```json
{
  "level": 30,
  "time": 1722639000000,
  "pid": 4812,
  "hostname": "api-pod-production-01",
  "name": "college-hub-kernel",
  "environment": "production",
  "moduleId": "rate-my-professor",
  "tenantId": "college-stanford-001",
  "traceId": "c7a8e9f0-1234-5678-9abc-def012345678",
  "userId": "usr-9876",
  "msg": "Submitted professor review rating"
}
```

---

## 2. Field Definitions Matrix

| Log Field     | Data Type           | Requirement   | Description & Format                                                                |
| :------------ | :------------------ | :------------ | :---------------------------------------------------------------------------------- |
| `level`       | `number` / `string` | **Mandatory** | Pino log severity level (10=trace, 20=debug, 30=info, 40=warn, 50=error, 60=fatal). |
| `time`        | `number`            | **Mandatory** | UNIX epoch timestamp in milliseconds.                                               |
| `name`        | `string`            | **Mandatory** | Service identifier (e.g. `college-hub-kernel`, `notification-worker`).              |
| `environment` | `string`            | **Mandatory** | Deployment environment (`development`, `test`, `staging`, `production`).            |
| `traceId`     | `string`            | Contextual    | W3C `traceparent` or correlation UUID tracking a request across services.           |
| `tenantId`    | `string`            | Contextual    | College tenant identifier (`college_id` or slug).                                   |
| `userId`      | `string`            | Contextual    | Authenticated student or admin user ID.                                             |
| `moduleId`    | `string`            | Contextual    | Business feature module ID (`rate-my-professor`, `marketplace`, `auth`).            |
| `msg`         | `string`            | **Mandatory** | Human-readable log summary in imperative mood.                                      |

---

## 3. PII & Secret Redaction Policy

To comply with privacy laws (GDPR, FERPA) and prevent security key leakage:

- All logging instances wrap payloads through the Pino Redaction Engine using paths defined in `@college-hub/logger`.
- The following keys are automatically replaced with `"[REDACTED]"`:
  `password`, `passwordHash`, `token`, `accessToken`, `refreshToken`, `authorization`, `cookie`, `secret`, `apiKey`, `creditCard`, `ssn`.

---

## 4. AsyncLocalStorage Trace Propagation

```typescript
import { TraceContextStore, logger } from '@college-hub/logger';

// Wrap request execution thread
TraceContextStore.run({ traceId: 'tr-12345', tenantId: 'stanford-001', userId: 'user-777' }, () => {
  // Every log statement executed inside this block automatically inherits traceId, tenantId, and userId!
  logger.info('User fetched professor directory');
});
```

---

## 5. Future Observability Integration Strategy

1. **Grafana Loki**: Log entries format directly as single-line JSON streams, enabling Loki to index `tenantId`, `moduleId`, `level`, and `traceId` dynamically without logstash parsing overhead.
2. **OpenTelemetry Distributed Tracing**: Trace context properties (`traceId`, `spanId`) map 1-to-1 with W3C Distributed Tracing headers.
3. **Client Security Principle**: Internal stack traces, raw database errors, and secret values are logged internally for diagnostic auditing but **NEVER** returned in HTTP API error payloads to clients.

---

_End of Logging and Telemetry Specification._
