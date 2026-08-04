import argon2 from 'argon2';

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export interface Argon2Options {
  timeCost: number;
  memoryCost: number;
  parallelism: number;
  type: 0 | 1 | 2;
}

export const RECOMMENDED_ARGON2_OPTIONS: Argon2Options = {
  timeCost: 3,
  memoryCost: 65536, // 64 MB
  parallelism: 4,
  type: argon2.argon2id
};

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length < 10) {
    errors.push('Password must be at least 10 characters long.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter.');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter.');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one numeric digit.');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export async function hashPassword(
  password: string,
  options: Argon2Options = RECOMMENDED_ARGON2_OPTIONS
): Promise<string> {
  return argon2.hash(password, {
    type: options.type,
    timeCost: options.timeCost,
    memoryCost: options.memoryCost,
    parallelism: options.parallelism
  });
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash || !storedHash.startsWith('$argon2')) return false;
  try {
    return await argon2.verify(storedHash, password);
  } catch {
    return false;
  }
}

export function needsRehash(storedHash: string, options: Argon2Options = RECOMMENDED_ARGON2_OPTIONS): boolean {
  try {
    return argon2.needsRehash(storedHash, {
      timeCost: options.timeCost,
      memoryCost: options.memoryCost,
      parallelism: options.parallelism
    });
  } catch {
    return true;
  }
}

export async function isPasswordInHistory(
  newPassword: string,
  passwordHistory: string[],
  historyLimit = 5
): Promise<boolean> {
  const recentHashes = passwordHistory.slice(-historyLimit);
  for (const oldHash of recentHashes) {
    const isMatch = await verifyPassword(newPassword, oldHash);
    if (isMatch) return true;
  }
  return false;
}
