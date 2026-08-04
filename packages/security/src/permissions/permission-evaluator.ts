import { logger } from '@college-hub/logger';
import { RoleEngine } from './role-engine.js';
import type { EvaluationContext, SimulationResult } from './permission-types.js';

export class PermissionEvaluator {
  private roleEngine: RoleEngine;
  private isEmergencyLockdown = false;

  constructor(roleEngine?: RoleEngine) {
    this.roleEngine = roleEngine || new RoleEngine();
  }

  public enableLockdown(): void {
    this.isEmergencyLockdown = true;
    logger.warn('🚨 EMERGENCY LOCKDOWN ENGAGED: Non-SuperAdmin access blocked globally.');
  }

  public disableLockdown(): void {
    this.isEmergencyLockdown = false;
    logger.info('✅ Emergency lockdown disengaged.');
  }

  public canUser(context: EvaluationContext): boolean {
    const simulation = this.simulatePermissionCheck(context);
    return simulation.allowed;
  }

  public simulatePermissionCheck(context: EvaluationContext): SimulationResult {
    const chain: string[] = [];

    // 1. Emergency Lockdown Check
    if (this.isEmergencyLockdown && !context.userRoles.includes('SUPER_ADMIN')) {
      chain.push('Emergency Lockdown ACTIVE: Access denied for non-SUPER_ADMIN.');
      return {
        allowed: false,
        matchedRule: 'EMERGENCY_LOCKDOWN',
        reason: 'Platform is under Emergency Lockdown.',
        decisionChain: chain
      };
    }

    // 2. Super Admin Bypass
    if (context.userRoles.includes('SUPER_ADMIN')) {
      chain.push('Actor has SUPER_ADMIN role: Access granted via Super Admin bypass.');
      return {
        allowed: true,
        matchedRule: 'SUPER_ADMIN_BYPASS',
        reason: 'Super Admin bypass.',
        decisionChain: chain
      };
    }

    // 3. User Overrides Check (Explicit DENY takes precedence over ALLOW regardless of order)
    if (context.userOverrides && context.userOverrides.length > 0) {
      // First check for active DENY override
      const denyOverride = context.userOverrides.find(
        (o) => o.permission === context.permission && o.effect === 'DENY' && (!o.expiresAt || new Date() <= o.expiresAt)
      );

      if (denyOverride) {
        chain.push(`Explicit DENY override found for permission '${context.permission}'. Access DENIED.`);
        return {
          allowed: false,
          matchedRule: 'EXPLICIT_DENY_OVERRIDE',
          reason: `Explicit DENY override: ${denyOverride.reason || 'No reason provided'}`,
          decisionChain: chain
        };
      }

      // Next check for active ALLOW override
      const allowOverride = context.userOverrides.find(
        (o) =>
          o.permission === context.permission && o.effect === 'ALLOW' && (!o.expiresAt || new Date() <= o.expiresAt)
      );

      if (allowOverride) {
        chain.push(`Explicit ALLOW override found for permission '${context.permission}'. Access ALLOWED.`);
        return {
          allowed: true,
          matchedRule: 'EXPLICIT_ALLOW_OVERRIDE',
          reason: `Explicit ALLOW override: ${allowOverride.reason || 'No reason provided'}`,
          decisionChain: chain
        };
      }
    }

    // 4. Role Permissions Check across user roles
    const effectivePermissions = new Set<string>();
    for (const role of context.userRoles) {
      const rolePerms = this.roleEngine.getRolePermissions(role, context.collegeId);
      for (const p of rolePerms) {
        effectivePermissions.add(p);
      }
    }

    if (effectivePermissions.has(context.permission)) {
      chain.push(`Permission '${context.permission}' granted via user roles [${context.userRoles.join(', ')}].`);
      return {
        allowed: true,
        matchedRule: 'ROLE_PERMISSION',
        reason: 'Granted via role assignment.',
        decisionChain: chain
      };
    }

    // 5. Default Deny Fallback
    chain.push(
      `Permission '${context.permission}' not found in user roles [${context.userRoles.join(', ')}]. Default DENY applied.`
    );
    return {
      allowed: false,
      matchedRule: 'DEFAULT_DENY',
      reason: 'Access denied by Default Deny policy.',
      decisionChain: chain
    };
  }
}
