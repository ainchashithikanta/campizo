export interface ValidationIssue {
  field: string;
  message: string;
}

export interface ValidationResult<T = unknown> {
  valid: boolean;
  data?: T;
  issues?: ValidationIssue[];
}

/**
 * Open Interface Extension Map for Dynamic Feature Modules.
 * Future modules augment this interface to register module-specific DTOs without modifying core type code.
 */
export interface ModuleExtensionMap {
  'rate-my-professor': Record<string, unknown>;
  'materials-pyqs': Record<string, unknown>;
  marketplace: Record<string, unknown>;
  confessions: Record<string, unknown>;
  'placement-guidance': Record<string, unknown>;
  'blind-date': Record<string, unknown>;
  notifications: Record<string, unknown>;
}

export type KnownModuleId = keyof ModuleExtensionMap;
