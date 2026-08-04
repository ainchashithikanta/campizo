import { envSchema, type EnvConfig, type EnvironmentMode } from './env.schema.js';
import dotenv from 'dotenv';

export class ConfigService {
  private static instance: ConfigService | null = null;
  private readonly config: EnvConfig;

  constructor(customEnv?: Record<string, unknown>) {
    if (!customEnv && process.env.NODE_ENV !== 'test') {
      dotenv.config();
    }
    const source = customEnv || process.env;
    const result = envSchema.safeParse(source);

    if (!result.success) {
      const formattedErrors = JSON.stringify(result.error.format(), null, 2);
      console.error('❌ CRITICAL CONFIGURATION FAILURE - Invalid Environment Variables:\n', formattedErrors);
      throw new Error(
        `Environment configuration validation failed: ${result.error.issues[0]?.message || 'Invalid config'}`
      );
    }

    this.config = result.data;
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  public get<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
    return this.config[key];
  }

  public get mode(): EnvironmentMode {
    return this.config.NODE_ENV;
  }

  public isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  public isTest(): boolean {
    return this.config.NODE_ENV === 'test';
  }

  public isStaging(): boolean {
    return this.config.NODE_ENV === 'staging';
  }

  public isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  /**
   * Returns a safe, redacted dictionary of configuration parameters for diagnostic logging.
   * All secret credentials (passwords, JWT secrets, encryption keys, API tokens) are censored to "[REDACTED]".
   */
  public toPublicConfig(): Record<string, unknown> {
    const redactedKeys = [
      'POSTGRES_PASSWORD',
      'REDIS_PASSWORD',
      'JWT_SECRET',
      'ENCRYPTION_KEY_32_BYTES',
      'S3_SECRET_ACCESS_KEY',
      'FIREBASE_CREDENTIALS_JSON',
      'TYPESENSE_API_KEY',
      'OPENAI_API_KEY'
    ];

    const copy: Record<string, unknown> = { ...this.config };
    for (const key of redactedKeys) {
      if (key in copy && copy[key]) {
        copy[key] = '[REDACTED]';
      }
    }
    return copy;
  }
}

export function loadEnv(customEnv?: Record<string, unknown>): EnvConfig {
  const service = new ConfigService(customEnv);
  return service.toPublicConfig() as unknown as EnvConfig;
}
