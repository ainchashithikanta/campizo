/**
 * Error Tracking & Incident Response — Error Classifier (MS-56)
 * Maps an unknown error + capture source to one of the canonical ErrorClass
 * categories using error codes, messages and HTTP status codes.
 */

import type { ErrorClass, ErrorSource } from '../domain/entities.js';
import { extractErrorCode, extractErrorMessage, extractErrorName } from './error-introspection.js';

const NETWORK_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'ECONNRESET',
  'EPIPE',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'ESOCKETTIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT'
]);

/** PostgreSQL error code classes (SQLSTATE prefixes) indicating database-layer failures. */
const DATABASE_ERROR_CODE_PREFIXES = ['08', '22', '23', '28', '40', '42', '53', '57', '58'];

export interface ClassifierInput {
  error: unknown;
  source: ErrorSource;
  statusCode?: number | undefined;
}

export class ErrorClassifier {
  public classify(input: ClassifierInput): ErrorClass {
    const code = extractErrorCode(input.error) ?? '';
    const message = extractErrorMessage(input.error).toLowerCase();
    const name = extractErrorName(input.error).toLowerCase();
    const source = input.source;
    const statusCode = input.statusCode;

    if (NETWORK_ERROR_CODES.has(code.toUpperCase())) {
      return source === 'database' || source === 'redis' ? 'Database' : 'Network';
    }

    if (DATABASE_ERROR_CODE_PREFIXES.some((prefix) => code.startsWith(prefix))) {
      return 'Database';
    }

    if (source === 'database' || source === 'redis') {
      return 'Database';
    }

    if (statusCode !== undefined) {
      if (statusCode === 400 || statusCode === 422) {
        return 'Validation';
      }
      if (statusCode === 401) {
        return 'Authentication';
      }
      if (statusCode === 403) {
        return 'Authorization';
      }
      if (statusCode === 404 || statusCode === 409) {
        return 'BusinessLogic';
      }
    }

    const text = `${name} ${message}`;

    if (/forbidden|access denied|insufficient (permission|role)/.test(text)) {
      return 'Authorization';
    }
    if (/unauthorized|authentication|invalid token|expired token|jwt|login failed/.test(text)) {
      return 'Authentication';
    }
    if (/validation|zod|malformed|invalid input|schema|expected .* but received|must be (a|an|\d)/.test(text)) {
      return 'Validation';
    }
    if (
      /syntax error at or near|relation .* does not exist|table .* does not exist|column .* does not exist|deadlock|serialization failure|duplicate key|violates foreign key|connection to .* failed|connect .* refused|pg_/.test(
        text
      )
    ) {
      return 'Database';
    }
    if (
      /out of memory|heap limit|javascript heap|worker crashed|killed|eaddrinuse|socket hang up|concurrent request limit/.test(
        text
      )
    ) {
      return 'Infrastructure';
    }
    if (/not found|already exists|conflict|not allowed|cannot|must not|out of stock|reservation/.test(text)) {
      return 'BusinessLogic';
    }

    switch (source) {
      case 'queue':
      case 'startup':
      case 'shutdown':
      case 'health':
      case 'module':
        return 'Infrastructure';
      case 'worker':
        return 'Infrastructure';
      default:
        return 'Unknown';
    }
  }
}
