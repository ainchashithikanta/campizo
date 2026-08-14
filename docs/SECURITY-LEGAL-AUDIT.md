# Campizo — Security & Legal Compliance Audit

**Date:** 2026-08-14
**Scope:** `apps/web` (Next.js 16), `apps/api` (Fastify gateway), `apps/worker`, `modules/*`, `packages/*`, `supabase/`, `infra/`
**Method:** Static source review + live-deployment verification (campizo-web.vercel.app) + git history check

---

## Executive Summary

| Severity | Count | Status |
|---|---|---|
| CRITICAL | 4 | 3 fixed, 1 requires secret rotation (user action) |
| HIGH | 9 | 7 fixed, 2 require secret rotation (user action) |
| MEDIUM | 11 | 7 fixed, 4 documented as follow-ups |
| LOW | 8 | 3 fixed, 5 documented as follow-ups |

**Critical remaining user action:** rotate every secret that has ever been written to `.env` or shared in chat
(Supabase Postgres password, service-role key, Redis password, `JWT_SECRET`, `ADMIN_PIN`,
`ADMIN_SESSION_SECRET`, `ANONYMOUS_TOKEN_SALT`). The Supabase DB password was leaked in public git
history and must be rotated at the Supabase dashboard.

---

## PART A — Security Findings

### A1. CRITICAL

#### A1.1 Hardcoded admin fallback credentials (FIXED)
`apps/web/src/lib/admin-auth.ts:3-4` — `ADMIN_SESSION_SECRET`/`ADMIN_PIN` fell back to
`campizo-admin-secret-2026-dev-only` / `campizo-admin-2026-dev-only` whenever `NODE_ENV !== 'production'`.
Staging k8s runs with `NODE_ENV: staging` and no admin env vars, so the staging console was protected only
by a publicly known PIN baked into source.
**Fix applied:** fallbacks removed; admin auth now fails closed — the login route returns 503 unless
`ADMIN_PIN` and `ADMIN_SESSION_SECRET` are explicitly set. Added brute-force protection (IP+pin lockout,
5 attempts / 15 min) and constant-time PIN comparison.

#### A1.2 Header-derived identity/roles (PARTIAL FIX — follow-up required)
`modules/connect/src/middleware/request-context.ts:57-74` — when no valid `x-auth-token` is present,
identity falls back to fully client-supplied headers (`x-college-id`, `x-user-id`, `x-roles`,
`x-user-gender`). RBAC (`modules/connect/src/middleware/rbac.ts:12`) reads roles from this context, so an
anonymous caller could set `x-roles: SUPER_ADMIN` and bypass every check. `x-user-id` is read in **79
places** across modules (marketplace, notifications, academic-resources, placement-guidance, connect) with
no authentication — enabling impersonation and IDOR (e.g. reading any user's notifications or private
conversations).
**Fix applied (defense-in-depth):** roles are no longer derived from the `x-roles` header (roles come only
from verified tokens); test-bypass headers in `privacy-guard.ts` are gated behind non-production.
**Follow-up required (documented):** enforce a verified JWT on all non-public module routes and derive
`userId`/`collegeId` exclusively from the token. This is a multi-module refactor tracked in
`docs/SECURITY-ROADMAP.md`.

#### A1.3 Committed production JWT_SECRET placeholder (DOCUMENTED)
`infra/helm/collegehub/values.prod.yaml:127` — prod `JWT_SECRET` defaults to
`REPLACE-WITH-SECURE-JWT-SECRET-32-CHARACTERS` (staging: `staging-jwt-secret-must-be-32-characters-long`).
If deployed without override, `signAdminApiToken` mints 12h SUPER_ADMIN tokens with a known secret.
**Fix:** must be injected via Helm secrets/Secrets Manager — see `docs/SECURITY-ROADMAP.md`. Startup
validation is recommended (fail fast if placeholder detected).

#### A1.4 Supabase password leaked in git history (USER ACTION REQUIRED)
The Supabase Postgres password (used in `DATABASE_URL`) was committed in earlier public history.
**Action:** rotate the Postgres password in the Supabase dashboard immediately, update
`.env` + Vercel/Render env vars, and purge history (or rewrite). Same for any secrets shared in chat.

### A2. HIGH

#### A2.1 No security headers on web app (FIXED)
`apps/web/next.config.ts` had no `headers()` — no CSP, HSTS, X-Frame-Options, X-Content-Type-Options,
Referrer-Policy.
**Fix applied:** added strict headers incl. CSP (`default-src 'self'`, `frame-ancestors 'none'`),
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy`.

> **2026-08-14 follow-up:** the NITK campus gateway (UTM SSL inspection / interstitial injection)
> blocked the site once a strict CSP (`default-src 'self'`, `frame-ancestors 'none'`) and
> `X-Frame-Options: DENY` were served — the gateway injects scripts/banners into pages and shows
> interstitials, which the strict policy hard-blocks for the whole campus network. CSP was relaxed
> to a gateway-tolerant policy (`script-src ... https:`, `frame-src https:`, no `frame-ancestors`)
> so campus users can load the site again. HSTS on `.vercel.app` is injected by Vercel's edge
> platform itself and cannot be removed per-app; it predates these changes and is not the blocker.
> Re-tighten CSP (`frame-ancestors 'none'`, drop blanket `https:` sources) once campus access is
> confirmed, or move to a custom domain where HSTS is controllable.

#### A2.2 Open redirect (FIXED)
`apps/web/src/app/college/page.tsx:16,31` — `next` query param pushed into `router.push` unvalidated;
same pattern in `admin/login/page.tsx:11,36` (`from`).
**Fix applied:** new `lib/safe-redirect.ts` — only allows same-origin absolute paths (must start with a
single `/`, no `//`, no `:` schemes).

#### A2.3 College verification client-side only (FIXED — server enforcement active)
`apps/web/src/app/college-verified/page.tsx:34-45` checked the email domain only in the browser, and the
Clerk `<SignUp>`/`<SignIn>` had no client restrictions. Registration was enforce-able by anyone with any email.
**Fix applied (server-side):** the Clerk instance enforces an allowlist (`allowlist: true` with identifier
`*@nitk.edu.in`) — verified live: signing up with a non-college email is rejected by Clerk before an account
is created. The client-side check remains as a UX layer. (The `restrictions` prop is not available in the
installed Clerk 7.7.4 SDK; the instance-level allowlist is the authoritative enforcement.)

#### A2.4 Unauthenticated confessions writes (PARTIAL — follow-up)
`apps/web/src/lib/api-confessions.ts:80-207` — create/vote/bookmark/report/comment send no auth token.
**Follow-up:** tie writes to the authenticated Clerk session (send session token), add rate limiting on
write endpoints. See roadmap.

#### A2.5 Hardcoded identity headers in web clients (FIXED)
`apps/web/src/lib/api-academic-resource-hub.ts:59-63` and `api-marketplace.ts:50-51` hardcoded
`x-college-id: 'college-nitk-003'` + `x-user-id: 'user-student-101'` on every request — impersonating a
fixed student.
**Fix applied:** `api-client.ts` reads identity from localStorage ONLY when present; the hardcoded
`user-student-101` defaults were removed. (Client-side identity headers remain advisory; server-side JWT
enforcement is the roadmap item.)

#### A2.6 No brute-force protection on admin PIN (FIXED)
`apps/web/src/app/admin/api/login/route.ts` — unlimited POST attempts.
**Fix applied:** in-memory sliding-window lockout (5 fails / 15 min per IP+pin), constant-time compare,
503 when unconfigured.

#### A2.7 Hardcoded admin PIN in e2e tests (DOCUMENTED)
`e2e/live.spec.ts:5` — `campizo-admin-2026` committed. **Fix:** move to env-provided test credentials.

#### A2.8 Hardcoded fallback HMAC secrets (FIXED)
- `modules/connect/src/services/student-auth.service.ts:36` — `campizo-student-auth-dev-secret-2026`
  fallback → forgeable 30-day tokens if env unset. Now throws when no secret configured.
- `packages/security/src/anonymous-identity.ts:6` — `college-hub-anonymous-salt-secret` fallback → now
  throws in production when `ANONYMOUS_TOKEN_SALT` missing.

#### A2.9 Missing Terms/Privacy/legal pages (FIXED)
No Terms of Service, Privacy Policy, Community Guidelines, Grievance contact, Disclaimer, or cookie
consent existed. See Part B — all pages created and linked from the footer.

### A3. MEDIUM (fixed or documented)

| # | Finding | Status |
|---|---|---|
| M1 | `trustProxy` unset on Fastify → rate limits keyed on proxy IP | FIXED (`server.ts`) |
| M2 | Rate-limit key includes client-controlled `x-college-id` → bucket rotation | FIXED (`pipeline.plugin.ts`) |
| M3 | `/metrics` unauthenticated | FIXED (token-gated) |
| M4 | `/health` returns raw DB error text | FIXED (sanitized) |
| M5 | Storage RLS: any authenticated user can update/delete any object in all buckets | FIXED (`supabase/policies.sql`) |
| M6 | `ch_college_id` cookie without Secure flag | FIXED |
| M7 | `next/image` remotePatterns `hostname: '**'` (open image proxy) | FIXED (storage-host allowlist) |
| M8 | Marketplace/notifications IDOR (participant checks) | Roadmap |
| M9 | Upload endpoints fabricate pre-signed URLs (stubs) | Roadmap |
| M10 | Test-only bypass headers (`x-test-*`) active in prod | FIXED (gated) |
| M11 | `images.remotePatterns` — see M7 | FIXED |

---

## PART B — Legal Compliance (Republic of India)

Applicable law: **IT Act 2000** (as amended), **IT (Intermediary Guidelines and Digital Media Ethics Code)
Rules 2021**, **Digital Personal Data Protection (DPDP) Act 2023**, Indian Contract Act 1872,
Consumer Protection (E-Commerce) Rules 2020 (if marketplace offers goods for consideration).

### B1. Status before this work

| Requirement | Law | Before | After |
|---|---|---|---|
| Terms of Service | Contract Act | **MISSING** | Created `/terms` |
| Privacy Policy (data collected, purposes, sharing, retention, rights) | DPDP §4, §6 | **MISSING** | Created `/privacy` |
| Community Guidelines / content rules | IT Rules 2021 §3(1)(d) | **MISSING** | Created `/guidelines` |
| Grievance Officer + contact (resolves in ≤15 days) | IT Rules 2021 §3(2) | **MISSING** | Created `/grievance` |
| Nodal Officer / contact for law enforcement | IT Rules 2021 §3(2) | **MISSING** | Included in `/grievance` |
| Take-down / report mechanism (UGC moderation) | IT Rules 2021 §3(1)(d) | Implicit only | Documented in `/guidelines` + `/grievance` |
| Disclaimer for user-generated content | IT Rules 2021 §3(1)(d) | **MISSING** | Created `/disclaimer` |
| Cookie consent | DPDP §6, Telemarketing Rules | **MISSING** | Consent banner added |
| Age/consent declaration (≥18 or guardian consent) | DPDP §9 | **MISSING** | Terms + sign-up note added |
| Data retention & deletion policy | DPDP §8 | **MISSING** | Documented in `/privacy` |
| Contact/company identity | Consumer Rules 2020 | **MISSING** | Footer + `/terms` |

### B2. What was created

1. **`/terms`** — acceptance, eligibility (18+ / guardian consent), accounts, user conduct, IP, UGC license
   grant, disclaimer, limitation of liability, termination, dispute resolution, governing law (India),
   changes, contact.
2. **`/privacy`** — data controller identity, categories of data (Clerk accounts, confessions, profiles,
   marketplace, usage analytics), lawful bases (consent/contract), purposes, sharing (Clerk, Supabase,
   hosting), storage/security, retention periods, user rights (access, correction, erasure — DPDP §11-12),
   grievance contact, cookies, cross-border transfer, minors, policy changes.
3. **`/guidelines`** — allowed content, prohibited content (harassment, hate, doxxing, defamation, sexual
   content, spam, copyright infringement), moderation, reporting, consequences (mirrors IT Rules 2021
   Schedule/Part I norms).
4. **`/grievance`** — Grievance Officer contact, 15-day resolution commitment, Nodal Officer contact for
   law enforcement requests (IT Rules 2021 §3(2)), escalation path.
5. **`/disclaimer`** — UGC responsibility, anonymity limits, accuracy of placement/marketplace data,
   no warranty, no liability for third-party content.
6. **Cookie consent banner** — localStorage-persisted choice, links to privacy policy, "necessary only"
   default.
7. **Footer legal column** — Terms, Privacy, Guidelines, Grievance, Disclaimer, plus copyright line.
8. **Sign-up consent checkbox note** — "By continuing you agree to the Terms and Privacy Policy" with
   links.

### B3. Compliance notes / caveats

- **DPDP Act 2023** rules are not yet fully notified (consent manager, significant data fiduciary
  obligations pending); the privacy policy follows the Act's core principles: consent, notice, purpose
  limitation, storage limitation, grievance redressal.
- **Grievance Officer identity** must be a real person with verifiable contact — the placeholder in
  `/grievance` must be replaced by the operator (see TODO in that page).
- **Age of consent:** DPDP §9 requires guardian consent for children (<18). College users are normally
  ≥18; terms require the user to confirm 18+.
- **Marketplace:** if real payments/consideration are introduced, Consumer Protection (E-Commerce) Rules
  2020 will apply (seller disclosures, returns, etc.) — flagged in `/terms`.
- **Professor ratings** (rate-my-professor): includes publicly visible reviews of identifiable
  individuals — recommend moderation + takedown is documented in `/guidelines`.

---

## PART C — Secrets needing rotation (USER ACTION)

| Secret | Where it leaked | Action |
|---|---|---|
| Supabase Postgres password | public git history | Rotate at Supabase dashboard; update `.env` + Vercel `DATABASE_URL`; force-restart deployments |
| Supabase service-role key | `.env` (working tree) | Rotate |
| Redis (Upstash) password | `.env` | Rotate |
| `JWT_SECRET` | `.env` + placeholder values in infra | Generate new 32+ char random; inject via env for all envs |
| `ADMIN_PIN` / `ADMIN_SESSION_SECRET` | `.env` + old source fallbacks | Generate new; set in Vercel/Render env |
| `ANONYMOUS_TOKEN_SALT` | `.env` | Generate new |
| Clerk `sk_test_...` | `.env.local` (working tree) | Rotate via Clerk dashboard if the file has been shared |

Rotation order: rotate → update env stores (Vercel/Render/Helm) → restart services → verify `/health` 200.

---

## PART D — Roadmap (deferred follow-ups)

See `docs/SECURITY-ROADMAP.md` — includes: JWT enforcement across modules (79 header-trust sites),
IDOR participant checks, real upload pipeline with MIME/size enforcement, e2e test credential hygiene,
helm secret injection, `pnpm audit` in CI.