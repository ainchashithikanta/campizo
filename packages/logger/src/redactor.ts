export const PII_REDACTION_PATHS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'headers.authorization',
  'headers.cookie',
  'secret',
  'apiKey',
  'creditCard',
  'ssn',
  '*.password',
  '*.passwordHash',
  '*.secret',
  '*.token',
  '*.apiKey'
];

export function redactSensitiveObject<T extends Record<string, unknown>>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const copy = JSON.parse(JSON.stringify(obj));
  const sensitiveKeys = new Set([
    'password',
    'passwordhash',
    'token',
    'accesstoken',
    'refreshtoken',
    'authorization',
    'cookie',
    'secret',
    'apikey',
    'creditcard',
    'ssn'
  ]);

  function sanitize(target: any) {
    if (!target || typeof target !== 'object') return;

    for (const key of Object.keys(target)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.has(lowerKey)) {
        target[key] = '[REDACTED]';
      } else if (typeof target[key] === 'object') {
        sanitize(target[key]);
      }
    }
  }

  sanitize(copy);
  return copy as T;
}
