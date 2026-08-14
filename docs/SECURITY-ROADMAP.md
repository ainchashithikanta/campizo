# Campizo — Security Remediation Roadmap

Deferred follow-ups from `docs/SECURITY-LEGAL-AUDIT.md`, ordered by priority. Items marked
**P0/P1/P2** are the recommended next batches.

## P0 — Server-side JWT enforcement (header-trust removal)

The gateway and all modules currently derive identity from client-supplied headers
(`x-user-id`, `x-college-id`, `x-auth-token` — 79 call sites). This is the single biggest
remaining vulnerability (impersonation + IDOR).

1. Issue short-lived signed JWTs (use `packages/security/src/jwt.ts`, which refuses weak secrets)
   at sign-in, bound to the verified Clerk session / student account with `userId`, `collegeId`,
   `roles` claims.
2. Add one gateway-level `authenticate` hook that resolves `request.authContext` from the token and
   **rejects** requests that claim identity without a verifiable token on non-public routes.
3. Refactor `request-context.ts` (connect + confessions) to use `authContext` only.
4. Update module tests that currently encode header-trust behavior.

## P0 — Fix IDORs

- `modules/marketplace/src/queries/marketplace.queries.ts:146-151` — participant check before
  returning conversation messages.
- `modules/connect/src/controllers/conversation.controller.ts:33-37` — participant check on read.
- `modules/notifications/src/presentation/controller.ts` — derive recipient from token only;
  restrict `POST /notifications/publish` to server/moderator.
- `modules/connect/src/queries/connect.queries.ts:64-71` — never expose `email`; only allow
  `studentProfileId === authenticated userId`.

## P0 — Enforce admin-secret hygiene

- `infra/helm/collegehub/values.prod.yaml:127` — replace `REPLACE-WITH-SECURE-JWT-SECRET-32-CHARACTERS`
  placeholder with a real injected secret (Helm secret / Secrets Manager) and add a startup guard
  that fails fast when placeholders are detected.
- `e2e/live.spec.ts:5` — move hardcoded admin PIN to env-provided test credentials.

## P1 — Authenticated confessions writes

- `apps/web/src/lib/api-confessions.ts` — send the session/API token on create/vote/bookmark/report/comment.
- Wire the existing `AdaptiveRateLimiter` (5 confessions/hr, 30 comments/hr) into the routes
  (`modules/confessions/src/enhancements/adaptive-rate-limiter.ts` is defined but unused).

## P1 — Real upload pipeline

- Upload endpoints in marketplace/academic-resource-hub fabricate pre-signed URLs and accept any
  MIME type / client-supplied `storageKey`.
- Wire through `packages/providers/src/supabase-storage.provider.ts` (MIME allowlist + size cap
  already implemented there), generate server-side keys, and gate publishing on scan status.

## P2 — CI hardening

- Run `pnpm audit` on every merge to `main` (currently only a manual scripted check).
- Enable GitHub secret scanning / CodeQL and fail the build on `pnpm audit` high+ findings.

## P2 — Operational

- Protect `/metrics` with an allowlist/basic-auth (token gate added, verify config in prod env).
- Add `ALLOWED_ORIGINS` for the real production origin (currently only localhost in `.env`).
- Re-run `scripts/run-security-audit.js` after each batch and update
  `docs/SECURITY-LEGAL-AUDIT.md` statuses.
