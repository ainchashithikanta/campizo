# ADR 0003: Multi-Tenant Data Isolation via PostgreSQL Row Level Security (RLS)

- **Status**: Approved
- **Date**: 2026-08-02
- **Deciders**: Principal Software Architect

## Context

College Hub must serve hundreds of colleges while maintaining strict data isolation between institutions. Accidental leaks of data across colleges (e.g. materials, student profiles, confessions) would violate compliance and security policies.

## Decision

We adopt a **Shared Database, Isolated Schema with PostgreSQL Row Level Security (RLS)**:

- Every tenant database table includes a mandatory `college_id` foreign key column.
- RLS policies are enabled on all multi-tenant tables (`USING (college_id = CURRENT_SETTING('app.current_college_id', true))`).
- Fastify middleware extracts the tenant ID from request headers/subdomains and sets `app.current_college_id` on the database session before query execution.

## Consequences

### Positive

- Guaranteed data isolation at the database engine level (queries without tenant filters will automatically return zero rows belonging to other colleges).
- Cost-effective hardware utilization compared to separate databases per tenant.
- Simplified schema migration management across all tenants simultaneously.

### Negative

- Requires careful handling of connection pools to reset `app.current_college_id` between requests.
