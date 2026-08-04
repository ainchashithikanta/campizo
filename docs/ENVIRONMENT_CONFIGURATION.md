# College Hub: Environment Configuration & Secrets Governance (MS-03)

## Document Overview

- **Project**: College Hub (Enterprise Multi-College Platform)
- **Document Title**: Environmental Configuration Specification & Security Governance
- **Document Version**: 1.0.0-FINAL
- **Package Reference**: `@college-hub/config`
- **Status**: Official Engineering Standard (MS-03 Complete)

---

## 1. Environment Variable Reference Matrix

| Variable Name              | Type     | Required | Default Value           | Security Level    | Purpose & Constraints                                                                          |
| :------------------------- | :------- | :------- | :---------------------- | :---------------- | :--------------------------------------------------------------------------------------------- |
| `CONFIG_VERSION`           | `string` | No       | `"1.0.0"`               | `PUBLIC`          | Version string of the environmental schema layout.                                             |
| `NODE_ENV`                 | `enum`   | No       | `"development"`         | `PUBLIC`          | Mode selector: `development`, `test`, `staging`, `production`.                                 |
| `PORT`                     | `number` | No       | `4000`                  | `PUBLIC`          | API Fastify HTTP server port (1024-65535).                                                     |
| `HOST`                     | `string` | No       | `"0.0.0.0"`             | `PUBLIC`          | Network interface binding host address.                                                        |
| `LOG_LEVEL`                | `enum`   | No       | `"info"`                | `PUBLIC`          | Minimum log level threshold (`trace`, `debug`, `info`, `warn`, `error`, `fatal`).              |
| `POSTGRES_USER`            | `string` | No       | `"collegehub_user"`     | `RESTRICTED`      | Database user name for PostgreSQL connection.                                                  |
| `POSTGRES_PASSWORD`        | `string` | Yes      | -                       | `CRITICAL SECRET` | Database password. Redacted from logs automatically.                                           |
| `POSTGRES_DB`              | `string` | No       | `"collegehub_db"`       | `PUBLIC`          | Primary PostgreSQL database name.                                                              |
| `POSTGRES_PORT`            | `number` | No       | `5432`                  | `PUBLIC`          | PostgreSQL database connection port.                                                           |
| `DATABASE_URL`             | `url`    | **YES**  | -                       | `CRITICAL SECRET` | PostgreSQL connection string URL including credentials.                                        |
| `DATABASE_MAX_CONNECTIONS` | `number` | No       | `20`                    | `PUBLIC`          | Connection pool size limit (1-100).                                                            |
| `REDIS_PORT`               | `number` | No       | `6379`                  | `PUBLIC`          | Redis cluster host port.                                                                       |
| `REDIS_URL`                | `url`    | **YES**  | -                       | `CRITICAL SECRET` | Redis connection URL string.                                                                   |
| `REDIS_PASSWORD`           | `string` | Optional | -                       | `CRITICAL SECRET` | Authentication password for Redis instance.                                                    |
| `JWT_SECRET`               | `string` | **YES**  | -                       | `CRITICAL SECRET` | Minimum 32-character string used to sign JWT tokens. Dummy values rejected in production mode. |
| `JWT_EXPIRES_IN`           | `string` | No       | `"15m"`                 | `PUBLIC`          | Short-lived Access Token validity duration.                                                    |
| `REFRESH_TOKEN_EXPIRES_IN` | `string` | No       | `"7d"`                  | `PUBLIC`          | Opaque Refresh Token validity duration.                                                        |
| `ENCRYPTION_KEY_32_BYTES`  | `string` | **YES**  | -                       | `CRITICAL SECRET` | Exactly 32-byte string used for AES-256-GCM symmetric database encryption.                     |
| `STORAGE_PROVIDER`         | `enum`   | No       | `"local"`               | `PUBLIC`          | Storage engine choice: `local`, `s3`, `r2`, `supabase`.                                        |
| `S3_ENDPOINT`              | `url`    | Optional | -                       | `PUBLIC`          | Custom S3 endpoint URL (used for local MinIO / R2).                                            |
| `S3_BUCKET_NAME`           | `string` | No       | `"collegehub-media"`    | `PUBLIC`          | Cloud object storage bucket target.                                                            |
| `S3_ACCESS_KEY_ID`         | `string` | Optional | -                       | `RESTRICTED`      | Object storage access key credential.                                                          |
| `S3_SECRET_ACCESS_KEY`     | `string` | Optional | -                       | `CRITICAL SECRET` | Object storage secret key credential. Redacted from logs.                                      |
| `NOTIFICATION_PROVIDER`    | `enum`   | No       | `"mock"`                | `PUBLIC`          | Push notification provider: `mock`, `firebase`, `expo`, `onesignal`.                           |
| `SMTP_HOST`                | `string` | No       | `"localhost"`           | `PUBLIC`          | Outgoing email SMTP server hostname (Mailpit in dev).                                          |
| `SMTP_PORT`                | `number` | No       | `1025`                  | `PUBLIC`          | Outgoing email SMTP port.                                                                      |
| `SEARCH_PROVIDER`          | `enum`   | No       | `"postgres"`            | `PUBLIC`          | Search engine choice: `postgres`, `typesense`, `meilisearch`, `elasticsearch`.                 |
| `AI_PROVIDER`              | `enum`   | No       | `"mock"`                | `PUBLIC`          | AI provider choice: `mock`, `openai`, `anthropic`, `ollama`.                                   |
| `OPENAI_API_KEY`           | `string` | Optional | -                       | `CRITICAL SECRET` | OpenAI API key credential. Redacted from logs.                                                 |
| `ALLOWED_ORIGINS`          | `csv`    | No       | `http://localhost:3000` | `PUBLIC`          | Comma-separated list of allowed CORS origins.                                                  |
| `COOKIE_DOMAIN`            | `string` | No       | `"localhost"`           | `PUBLIC`          | Cookie domain boundary target.                                                                 |

---

## 2. Environment Isolation & Security Rules

### Development (`NODE_ENV=development`)

- Default fallback parameters are populated for rapid onboarding (`pnpm dev`).
- `.env` is loaded automatically from disk via `dotenv`.

### Testing (`NODE_ENV=test`)

- Disables `dotenv` automatic file loading to prevent polluting ephemeral test runners (Testcontainers / Vitest).
- Allows mock credentials and ephemeral memory database connection URLs.

### Production (`NODE_ENV=production`)

- Fail-fast security validation:
  - Rejects dummy default `JWT_SECRET` strings.
  - Mandates strict minimum key lengths for all secrets.
  - Injected directly by platform infrastructure (Kubernetes Secrets / Doppler / AWS Secrets Manager).

---

## 3. Configuration Versioning & Deprecation Governance

Whenever an environment variable is renamed or deprecated in future milestones:

1. Update `CONFIG_VERSION` in `@college-hub/config` (e.g., from `1.0.0` to `1.1.0`).
2. Add transform fallback in `env.schema.ts` mapping legacy variable names to the new standard with a console deprecation warning.
3. Update `.env.example` and this handbook document simultaneously.

---

_End of Environment Configuration Specification._
