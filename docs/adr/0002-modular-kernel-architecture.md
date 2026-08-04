# ADR 0002: Plug-and-Play Modular Kernel with Dynamic Auto-Discovery

- **Status**: Approved
- **Date**: 2026-08-02
- **Deciders**: Principal Software Architect

## Context

College Hub must support adding future modules (e.g. Rate My Professor, Materials, Marketplace, Confessions, Placement, AI Counselor) without editing core router logic or risking regressions in existing modules.

## Decision

We implement a **Modular Monolith Kernel** using a Dynamic Module Auto-Discovery Registry:

- Every module exports a default class implementing the `CollegeHubModule` contract.
- The platform kernel scans the `/modules` folder at boot time, discovers manifests, registers API routes, and hooks into internal domain event streams.
- Modules communicate solely via typed async domain events and API contracts. Direct cross-module database table joins or internal service mutations are forbidden.

## Consequences

### Positive

- Zero core code modification when introducing new feature modules.
- Independent testability and code isolation per module.
- Easy extraction of heavy modules into micro-services in the future.

### Negative

- Inter-module data queries require event aggregation or provider interfaces rather than standard SQL JOINs.
