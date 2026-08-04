# ADR 0001: Monorepo Architecture with Turborepo and pnpm

- **Status**: Approved
- **Date**: 2026-08-02
- **Deciders**: Principal Software Architect

## Context

College Hub requires building a multi-application platform (API backend, Web frontend, Mobile app, Admin console) sharing core infrastructure (database schema, auth middleware, UI components, provider abstractions). Managing multiple git repositories creates version mismatch friction, duplicated code, and complex CI/CD dependency tracking.

## Decision

We adopt a **Single Monorepo** managed using **pnpm workspaces** and **Turborepo**:

- `/apps`: Contains runnable applications (`api`, `web`, `mobile`, `admin`).
- `/packages`: Shared internal libraries (`core`, `database`, `security`, `providers`, `feature-flags`, `theme-engine`, `ui`, `config`, `logger`, `types`).
- `/modules`: Independent, zero-coupling business feature modules.

## Consequences

### Positive

- Single source of truth across all apps.
- Compile-time type safety across API DTOs and client SDKs.
- Turborepo parallel build caching dramatically reduces CI pipeline execution time.
- Strict workspace import boundaries prevent circular dependencies.

### Negative

- Requires strict workspace dependency governance to prevent bloated client bundles.
