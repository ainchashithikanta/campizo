/**
 * Error Tracking & Incident Response — Error Introspection (MS-56)
 * Defensive extraction of message/name/code/stack/cause-chain from unknown
 * error values thrown across the platform (Error, string, plain object).
 */

interface UnknownErrorLike {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  stack?: unknown;
  cause?: unknown;
}

export function isErrorLike(value: unknown): value is UnknownErrorLike {
  return value !== null && typeof value === 'object';
}

export function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (isErrorLike(error) && typeof error.message === 'string') {
    return error.message;
  }
  if (isErrorLike(error) && typeof error.name === 'string') {
    return error.name;
  }
  return String(error);
}

export function extractErrorName(error: unknown): string {
  if (error instanceof Error) {
    return error.name;
  }
  if (isErrorLike(error) && typeof error.name === 'string') {
    return error.name;
  }
  return 'Error';
}

export function extractErrorCode(error: unknown): string | undefined {
  if (isErrorLike(error) && typeof error.code === 'string') {
    return error.code;
  }
  if (isErrorLike(error) && typeof error.code === 'number') {
    return String(error.code);
  }
  return undefined;
}

export function extractStackTrace(error: unknown): string | undefined {
  if (isErrorLike(error) && typeof error.stack === 'string') {
    return error.stack;
  }
  if (typeof error === 'string') {
    return undefined;
  }
  return undefined;
}

/** Flatten the cause chain into ordered "name: message" entries (most recent cause last). */
export function extractCauseChain(error: unknown, maxDepth = 5): string[] {
  const chain: string[] = [];
  let current = error;
  for (let depth = 0; depth < maxDepth; depth += 1) {
    if (!isErrorLike(current)) {
      break;
    }
    const name = typeof current.name === 'string' ? current.name : 'Error';
    const message = typeof current.message === 'string' ? current.message : String(current);
    chain.push(`${name}: ${message}`);
    if (!(current.cause instanceof Error) && !isErrorLike(current.cause)) {
      break;
    }
    current = current.cause;
  }
  return chain;
}

export function safeErrorAttributes(attributes: unknown): Record<string, unknown> {
  if (attributes !== null && typeof attributes === 'object' && !Array.isArray(attributes)) {
    return { ...(attributes as Record<string, unknown>) };
  }
  return {};
}
