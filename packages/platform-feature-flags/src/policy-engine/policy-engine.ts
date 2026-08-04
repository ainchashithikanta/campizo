/**
 * Pluggable Policy Engine Architecture
 */

import { EnvironmentType, LifecycleStageType } from '../domain/value-objects.js';
import { KillSwitchPolicy } from './policies/kill-switch.policy.js';
import { MaintenancePolicy } from './policies/maintenance.policy.js';
import { DependencyPolicy } from './policies/dependency.policy.js';
import { LifecyclePolicy } from './policies/lifecycle.policy.js';
import { VersionPolicy } from './policies/version.policy.js';
import { EnvironmentPolicy } from './policies/environment.policy.js';
import { PackPolicy } from './policies/pack.policy.js';
import { TemplatePolicy } from './policies/template.policy.js';
import { OverridePolicy } from './policies/override.policy.js';
import { RolloutPolicy } from './policies/rollout.policy.js';

export interface EvaluationContext {
  flagKey: string;
  environment: EnvironmentType;
  userId?: string | undefined;
  collegeId?: string | undefined;
  role?: string | undefined;
  clientAppVersion?: string | undefined;
  minAppVersion?: string | undefined;
  defaultState?: boolean | undefined;
  lifecycleStage?: LifecycleStageType | undefined;
  isKillSwitchActive?: boolean | undefined;
  isMaintenanceActive?: boolean | undefined;
  unmetDependencies?: string[] | undefined;
  disabledEnvironments?: string[] | undefined;
  userOverrides?: Record<string, boolean> | undefined;
  roleOverrides?: Record<string, boolean> | undefined;
  collegeOverrides?: Record<string, boolean> | undefined;
  rolloutPercentage?: number | undefined;
  packOverrideState?: boolean | undefined;
  templateEnforcedState?: boolean | undefined;
  configurationVersion?: number | undefined;
}

export interface PolicyResult {
  matched: boolean;
  enabled: boolean;
  reason: string;
  matchedRule: string;
}

export interface PolicyEvaluator {
  readonly name: string;
  evaluate(context: EvaluationContext): PolicyResult | null;
}

export class PolicyEngine {
  private readonly policies: PolicyEvaluator[] = [];

  constructor(customPolicies?: PolicyEvaluator[]) {
    if (customPolicies && customPolicies.length > 0) {
      this.policies = [...customPolicies];
    } else {
      // Default deterministic priority chain
      this.policies = [
        new KillSwitchPolicy(),
        new MaintenancePolicy(),
        new DependencyPolicy(),
        new LifecyclePolicy(),
        new VersionPolicy(),
        new EnvironmentPolicy(),
        new PackPolicy(),
        new TemplatePolicy(),
        new OverridePolicy(),
        new RolloutPolicy()
      ];
    }
  }

  registerPolicy(policy: PolicyEvaluator, position?: number): void {
    if (position !== undefined && position >= 0) {
      this.policies.splice(position, 0, policy);
    } else {
      this.policies.push(policy);
    }
  }

  evaluate(context: EvaluationContext): { result: PolicyResult; skippedRules: string[] } {
    const skippedRules: string[] = [];

    for (const policy of this.policies) {
      const outcome = policy.evaluate(context);
      if (outcome && outcome.matched) {
        return {
          result: outcome,
          skippedRules
        };
      }
      skippedRules.push(`${policy.name} (No Match / Inactive)`);
    }

    // Default Fallback
    const isDefaultEnabled = context.defaultState ?? false;
    return {
      result: {
        matched: true,
        enabled: isDefaultEnabled,
        reason: isDefaultEnabled ? 'DEFAULT_FLAG_STATE_ENABLED' : 'DEFAULT_FLAG_STATE_DISABLED',
        matchedRule: 'DefaultStateFallback'
      },
      skippedRules
    };
  }
}
