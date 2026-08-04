# ADR 0005: Per-College Configuration, Feature Flags, and Audit Logging

- **Status**: Approved
- **Date**: 2026-08-02
- **Deciders**: Principal Software Architect

## Context

Different colleges require different feature sets (e.g. Stanford enables Rate My Professor & Materials, MIT enables Marketplace & Confessions). Furthermore, administrative actions must be strictly audited for compliance and security.

## Decision

1. **Per-College Configuration**: Stored in `college_tenants` containing custom themes, allowed email domains, active module lists, and moderation policies.
2. **Dynamic Feature Flag Engine**: Middleware checks tenant feature flag enablement via Redis set lookup before executing any module handler.
3. **Mandatory Audit Logging**: All administrative actions (user role update, confession moderation, college config change) pass through an immutable Audit Logger producing structured event streams.

## Consequences

### Positive

- Fine-grained operational control per institution.
- Unmatched compliance and security visibility into administrative operations.
- Ability to soft-rollout or beta-test new modules with select colleges.

### Negative

- Adds a small Redis latency check on request routing, mitigated by high-performance Redis caching.
