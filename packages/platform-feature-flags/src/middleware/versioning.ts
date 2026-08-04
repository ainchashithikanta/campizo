/**
 * API Version Lifecycle Middleware
 * Inspects requested API version headers and enforces deprecation / sunset rules.
 */

export interface ApiVersionDetails {
  apiVersion: string;
  isDeprecated: boolean;
  sunsetDate?: string | undefined;
}

export function checkApiVersion(requestedVersion: string = 'v1'): ApiVersionDetails {
  if (requestedVersion === 'v1') {
    return {
      apiVersion: 'v1',
      isDeprecated: false
    };
  }
  if (requestedVersion === 'v0') {
    return {
      apiVersion: 'v0',
      isDeprecated: true,
      sunsetDate: '2026-12-31'
    };
  }
  return {
    apiVersion: requestedVersion,
    isDeprecated: false
  };
}
