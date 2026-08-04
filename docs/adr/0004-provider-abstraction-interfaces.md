# ADR 0004: Storage, Notification, Search, and AI Provider Abstractions

- **Status**: Approved
- **Date**: 2026-08-02
- **Deciders**: Principal Software Architect

## Context

Third-party vendor APIs (S3 vs Cloudflare R2, Firebase vs Expo Push, Typesense vs Elasticsearch, OpenAI vs Anthropic/Ollama) change over time, adjust pricing models, or require swapping out in specific environments. Core application logic must remain vendor-agnostic.

## Decision

We create strong provider abstraction interfaces in `@college-hub/providers`:

1. `IStorageProvider`: `uploadFile`, `getPresignedUploadUrl`, `deleteFile`.
2. `INotificationProvider`: `sendPush`, `sendBatchPush`.
3. `ISearchProvider`: `indexDocument`, `search`, `deleteDocument`.
4. `IAIProvider`: `generateText`, `generateEmbeddings`, `moderateContent`.

Modules consume only these interfaces via dependency injection.

## Consequences

### Positive

- Vendor independence: switch from AWS S3 to Cloudflare R2 or Local MinIO without modifying business logic.
- Effortless local mocking during unit and integration testing.
- Future-proof AI integration (support local models like Ollama or cloud models like GPT/Claude seamlessly).

### Negative

- Requires maintaining wrapper adapters for each integrated vendor service.
