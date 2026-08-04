import { describe, it, expect } from 'vitest';
import { ConfigService } from '../src/config.service.js';

describe('ConfigService & Environment Schema Validation', () => {
  const mockValidEnv = {
    NODE_ENV: 'development',
    PORT: '4000',
    DATABASE_URL: 'postgresql://collegehub_user:collegehub_password@localhost:5432/collegehub_db',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'a-very-long-secure-random-jwt-secret-key-32-chars',
    ENCRYPTION_KEY_32_BYTES: '0123456789abcdef0123456789abcdef',
    STORAGE_PROVIDER: 'local',
    NOTIFICATION_PROVIDER: 'mock',
    SEARCH_PROVIDER: 'postgres',
    AI_PROVIDER: 'mock'
  };

  it('should successfully parse and validate a valid environment configuration', () => {
    const configService = new ConfigService(mockValidEnv);
    expect(configService.get('PORT')).toBe(4000);
    expect(configService.get('NODE_ENV')).toBe('development');
    expect(configService.isDevelopment()).toBe(true);
    expect(configService.isProduction()).toBe(false);
  });

  it('should fail fast if required DATABASE_URL is missing', () => {
    const invalidEnv = { ...mockValidEnv, DATABASE_URL: undefined };
    expect(() => new ConfigService(invalidEnv as any)).toThrowError();
  });

  it('should fail fast if JWT_SECRET is less than 32 characters', () => {
    const invalidEnv = { ...mockValidEnv, JWT_SECRET: 'too-short-secret' };
    expect(() => new ConfigService(invalidEnv)).toThrowError();
  });

  it('should fail fast if ENCRYPTION_KEY_32_BYTES is not exactly 32 bytes', () => {
    const invalidEnv = { ...mockValidEnv, ENCRYPTION_KEY_32_BYTES: 'invalid-length' };
    expect(() => new ConfigService(invalidEnv)).toThrowError();
  });

  it('should enforce production security refinements by rejecting dummy JWT secret in production mode', () => {
    const dummyProdEnv = {
      ...mockValidEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'super-secret-jwt-token-key-minimum-32-characters-long'
    };
    expect(() => new ConfigService(dummyProdEnv)).toThrowError(/CRITICAL SECURITY RISK/);
  });

  it('should correctly redact sensitive credentials in toPublicConfig()', () => {
    const configService = new ConfigService(mockValidEnv);
    const publicConfig = configService.toPublicConfig();

    expect(publicConfig['JWT_SECRET']).toBe('[REDACTED]');
    expect(publicConfig['ENCRYPTION_KEY_32_BYTES']).toBe('[REDACTED]');
    expect(publicConfig['POSTGRES_PASSWORD']).toBe('[REDACTED]');
    expect(publicConfig['PORT']).toBe(4000);
  });
});
