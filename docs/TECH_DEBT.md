# College Hub: Technical Debt, Deferred Improvements & Architectural Backlog

## Document Overview

- **Project**: College Hub (Enterprise Multi-College Platform)
- **Document Title**: Technical Debt & Architectural Backlog Register
- **Document Version**: 1.0.0-INITIAL
- **Governance Rule**: Every intentional shortcut, deferred optimization, or temporary mock MUST be recorded in this register with an associated tracking ID, rationale, risk score, and remediation plan.

---

## Technical Debt Register Matrix

| Debt ID    | Category          | Description & Context                                                                                | Reason for Deferral                                                                         | Risk Level | Target Remediation Milestone | Status   |
| :--------- | :---------------- | :--------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------ | :--------- | :--------------------------- | :------- |
| **TD-001** | _Security / Auth_ | In-memory token revocation list fallback when Redis is offline.                                      | Redis cluster deployment scheduled for production phase.                                    | **MEDIUM** | MS-19 (Auth Engine)          | `LOGGED` |
| **TD-002** | _Search_          | Basic PostgreSQL `ILIKE` / `to_tsvector` search fallback used before Typesense cluster provisioning. | Prevents hard dependency on external search infrastructure during early module development. | **LOW**    | MS-16 (Search Provider)      | `LOGGED` |
| **TD-003** | _AI / Moderation_ | Heuristic keyword regex moderation fallback used before OpenAI API key configuration.                | Enables offline local testing without requiring active cloud AI API billing keys.           | **LOW**    | MS-17 (AI Provider)          | `LOGGED` |
| **TD-004** | _Database / RLS_  | Super Admin DB bypass policy uses hardcoded connection string flag in dev mode.                      | Facilitates initial database migration execution before full RBAC system bootstrapping.     | **MEDIUM** | MS-07 (RLS Engine)           | `LOGGED` |
| **TD-005** | _Storage_         | Local disk storage provider fallback used in place of Cloudflare R2 / AWS S3 in dev mode.            | Allows zero-cost, offline local file upload testing without cloud credentials.              | **LOW**    | MS-14 (Storage Provider)     | `LOGGED` |

---

## Technical Debt Governance Rules

1. **No Silent Shortcuts**: Engineers are strictly forbidden from leaving `// TODO` or temporary workarounds in code without registering a corresponding `TD-XXX` entry in this file.
2. **Pre-Release Audit**: Before any major release (e.g. v1.0.0 Production), all `HIGH` and `CRITICAL` risk tech debt items MUST be resolved.
3. **Remediation Tracking**: Resolved tech debt items are updated to status `RESOLVED` with the resolution PR linked.
