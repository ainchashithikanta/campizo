export type PermissionEffect = 'ALLOW' | 'DENY';

export interface PermissionOverride {
  permission: string;
  effect: PermissionEffect;
  expiresAt?: Date | undefined;
  reason?: string | undefined;
}

export interface RoleDefinition {
  name: string;
  description: string;
  permissions: Set<string>;
  parentRole?: string | undefined;
  isCustom?: boolean | undefined;
  collegeId?: string | undefined;
}

export interface SimulationResult {
  allowed: boolean;
  matchedRule: string;
  reason: string;
  decisionChain: string[];
}

export interface EvaluationContext {
  userId: string;
  userRoles: string[];
  collegeId: string;
  permission: string;
  targetOwnerId?: string | undefined;
  userOverrides?: PermissionOverride[] | undefined;
}
