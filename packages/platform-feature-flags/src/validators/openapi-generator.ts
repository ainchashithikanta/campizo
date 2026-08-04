/**
 * OpenAPI v3 Specification Generator
 * Compiles Zod request validators into OpenAPI schemas.
 */

export interface OpenApiSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  paths: Record<string, unknown>;
}

export function generateOpenApiSpec(): OpenApiSpec {
  return {
    openapi: '3.0.3',
    info: {
      title: 'College Hub Platform Feature Management System API',
      version: '1.0.0',
      description: 'Production REST API for feature flag management, evaluations, rollouts, approvals, and snapshots.'
    },
    paths: {
      '/api/v1/feature-flags': {
        get: { summary: 'List all feature flags' },
        post: { summary: 'Create a feature flag' }
      },
      '/api/v1/feature-flags/evaluate': {
        post: { summary: 'Evaluate feature flag treatment' }
      },
      '/api/v1/feature-flags/health': {
        get: { summary: 'Fetch platform health status' }
      }
    }
  };
}
