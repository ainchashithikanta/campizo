import { z } from 'zod';

export const EnvironmentMode = z.enum(['development', 'test', 'staging', 'production']);
export type EnvironmentMode = z.infer<typeof EnvironmentMode>;

export const envSchema = z
  .object({
    // Configuration Version & Mode
    CONFIG_VERSION: z.string().default('1.0.0'),
    NODE_ENV: EnvironmentMode.default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    HOST: z.string().default('0.0.0.0'),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    GRACEFUL_SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(30000),
    WORKER_HEALTH_PORT: z.coerce.number().int().min(1024).max(65535).optional(),

    // Observability Platform (Metrics, Tracing & Service Identity)
    SERVICE_NAME: z.string().default('college-hub'),
    METRICS_ENABLED: z.coerce.boolean().default(true),
    OTEL_TRACES_ENABLED: z.coerce.boolean().default(false),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),

    // Better Stack Logging & Monitoring Integration
    BETTERSTACK_SOURCE_TOKEN: z.string().optional(),
    BETTERSTACK_INGESTING_HOST: z.string().default('in.logs.betterstack.com'),

    // Resend Email Service Integration
    RESEND_API_KEY: z.string().optional(),
    MAIL_FROM: z.string().default('noreply@yourdomain.com'),
    MAIL_FROM_NAME: z.string().default('College Hub'),
    APP_URL: z.string().url().default('http://localhost:3000'),

    // Error Tracking & Incident Response (MS-56)
    ERROR_TRACKING_ENABLED: z.coerce.boolean().default(false),
    ERROR_TRACKING_TRANSPORTS: z
      .string()
      .default('console,structured')
      .transform((value) =>
        value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      ),
    ERROR_TRACKING_DEDUPE_WINDOW_MS: z.coerce.number().int().min(1000).max(86400000).default(86400000),

    // PostgreSQL Database (ACID Store with Row Level Security & Pgvector)
    POSTGRES_USER: z.string().default('collegehub_user'),
    POSTGRES_PASSWORD: z.string().default('collegehub_password'),
    POSTGRES_DB: z.string().default('collegehub_db'),
    POSTGRES_PORT: z.coerce.number().int().default(5432),
    DATABASE_URL: z.string().url(),
    DATABASE_MAX_CONNECTIONS: z.coerce.number().int().min(1).max(100).default(20),

    // Redis Cache, Session Store & Queue Cluster
    REDIS_PORT: z.coerce.number().int().default(6379),
    REDIS_URL: z.string().url(),
    REDIS_PASSWORD: z.string().optional(),

    // Security, Authentication & Cryptography
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long for security compliance'),
    JWT_EXPIRES_IN: z.string().default('15m'),
    REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
    ENCRYPTION_KEY_32_BYTES: z.string().length(32, 'ENCRYPTION_KEY_32_BYTES must be exactly 32 characters long'),

    // Storage Provider Abstraction
    STORAGE_PROVIDER: z.enum(['local', 's3', 'r2', 'supabase']).default('supabase'),
    S3_ENDPOINT: z.string().optional(),
    S3_REGION: z.string().default('us-east-1'),
    S3_BUCKET_NAME: z.string().default('collegehub-media'),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),

    // Supabase Core & Storage Configuration
    SUPABASE_URL: z.string().url().default('http://localhost:54321'),
    SUPABASE_ANON_KEY: z.string().default('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'),
    SUPABASE_SERVICE_ROLE_KEY: z.string().default('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'),
    SUPABASE_STORAGE_BUCKET_AVATARS: z.string().default('avatars'),
    SUPABASE_STORAGE_BUCKET_MARKETPLACE: z.string().default('marketplace'),
    SUPABASE_STORAGE_BUCKET_MATERIALS: z.string().default('materials'),
    SUPABASE_STORAGE_BUCKET_DOCUMENTS: z.string().default('documents'),
    SUPABASE_STORAGE_BUCKET_EVENTS: z.string().default('events'),
    SUPABASE_STORAGE_BUCKET_MISC: z.string().default('misc'),

    // Notification Provider Abstraction
    NOTIFICATION_PROVIDER: z.enum(['mock', 'firebase', 'expo', 'onesignal']).default('mock'),
    SMTP_HOST: z.string().default('localhost'),
    SMTP_PORT: z.coerce.number().int().default(1025),
    FIREBASE_CREDENTIALS_JSON: z.string().optional(),

    // Search Provider Abstraction
    SEARCH_PROVIDER: z.enum(['postgres', 'typesense', 'meilisearch', 'elasticsearch']).default('postgres'),
    TYPESENSE_API_KEY: z.string().optional(),
    TYPESENSE_HOST: z.string().optional(),
    TYPESENSE_PORT: z.coerce.number().int().optional(),

    // AI Provider Abstraction
    AI_PROVIDER: z.enum(['mock', 'openai', 'anthropic', 'ollama']).default('mock'),
    OPENAI_API_KEY: z.string().optional(),
    OLLAMA_BASE_URL: z.string().optional(),

    // Network CORS & Cookies
    ALLOWED_ORIGINS: z
      .string()
      .transform((val) => val.split(',').map((s) => s.trim()))
      .default('http://localhost:3000,http://localhost:3001'),
    COOKIE_DOMAIN: z.string().default('localhost')
  })
  .refine(
    (data) => {
      // Production Security Enforcements
      if (data.NODE_ENV === 'production') {
        if (data.JWT_SECRET.includes('super-secret-jwt-token-key')) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'CRITICAL SECURITY RISK: Dummy JWT_SECRET cannot be used in production environment!',
      path: ['JWT_SECRET']
    }
  );

export type EnvConfig = z.infer<typeof envSchema>;
