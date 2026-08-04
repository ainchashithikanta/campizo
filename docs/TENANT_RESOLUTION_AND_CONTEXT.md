# College Hub: Tenant Resolution & Request Context Specification (MS-08)

## Document Overview

- **Project**: College Hub (Enterprise Multi-College Platform)
- **Document Title**: Tenant Resolution Engine & Request Context Propagation
- **Document Version**: 1.0.0-FINAL
- **App Reference**: `@college-hub/api`
- **Status**: Official Engineering Standard (MS-08 Complete)

---

## 1. Multi-Tenant Resolution Priority Engine

Every incoming API request passes through `tenantContextPlugin` which evaluates tenant context using a 4-tier resolution priority:

```mermaid
graph TD
    Req[Incoming HTTP Request] --> P1{1. Custom Domain Match?}
    P1 -->|Host: hub.stanford.edu| Found[Set Tenant Context]
    P1 -->|No| P2{2. Subdomain Match?}
    P2 -->|Host: mit.collegehub.com| Found
    P2 -->|No| P3{3. X-College-ID Header Match?}
    P3 -->|Header: college-stanford-001| Found
    P3 -->|No| P4{4. Localhost / Dev Environment?}
    P4 -->|Localhost / Dev Mode| DevDefault[Set Stanford Default]
    P4 -->|Production & No Match| Error404[Return HTTP 404 UNKNOWN_TENANT]
```

---

## 2. Request Lifecycle & Context Propagation

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client App / Mobile
    participant Plugin as tenantContextPlugin
    participant TraceStore as AsyncLocalStorage (TraceContextStore)
    participant Handler as Fastify Route Handler
    participant RLS as Database RLS Engine (withTenantContext)

    Client->>Plugin: HTTP Request (Headers: Host / X-College-ID / X-Request-ID)
    Plugin->>Plugin: Generate / Extract traceId Correlation Header
    Plugin->>Plugin: Resolve Tenant Context (Custom Domain -> Subdomain -> Header)

    alt Invalid / Unknown Tenant
        Plugin-->>Client: Return HTTP 404 UNKNOWN_TENANT (ApiV1ErrorResponse)
    else Resolved Tenant
        Plugin->>TraceStore: TraceContextStore.run({ traceId, tenantId })
        Plugin->>Handler: Attach request.tenantContext & request.traceId
        Handler->>RLS: execute query inside withTenantContext(db, { collegeId })
        RLS-->>Client: Return API Response (Header: x-request-id)
    end
```

---

## 3. Concurrent Request Isolation Guarantee

Because Node.js runs an event loop handling hundreds of concurrent async requests:

- Request-scoped data (`tenantContext`, `traceId`) is bound directly to the Fastify `request` instance and Node.js `AsyncLocalStorage`.
- Concurrent request execution threads maintain isolated memory stores, preventing race condition data leaks.
- Verified via automated integration tests processing 20 parallel concurrent requests.

---

## 4. Development vs Production Behavior

- **Development (`NODE_ENV=development`)**: Unspecified host headers default to `college-stanford-001` for frictionless developer onboarding.
- **Production (`NODE_ENV=production`)**: Localhost fallback disabled; requests without a valid domain, subdomain, or explicit tenant header return an immediate `HTTP 404 UNKNOWN_TENANT` response.

---

_End of Tenant Resolution Specification._
