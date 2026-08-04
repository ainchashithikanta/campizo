import { EvaluationContext, PolicyResult, PolicyEvaluator } from '../policy-engine.js';

export class OverridePolicy implements PolicyEvaluator {
  public readonly name = 'OverridePolicy';

  evaluate(context: EvaluationContext): PolicyResult | null {
    // 1. User Override (Top precedence)
    if (context.userId && context.userOverrides && context.userId in context.userOverrides) {
      const state = context.userOverrides[context.userId];
      if (state !== undefined) {
        return {
          matched: true,
          enabled: state,
          reason: 'USER_OVERRIDE_MATCH',
          matchedRule: `${this.name}:User`
        };
      }
    }

    // 2. Role Override
    if (context.role && context.roleOverrides && context.role in context.roleOverrides) {
      const state = context.roleOverrides[context.role];
      if (state !== undefined) {
        return {
          matched: true,
          enabled: state,
          reason: 'ROLE_OVERRIDE_MATCH',
          matchedRule: `${this.name}:Role`
        };
      }
    }

    // 3. College Override
    if (context.collegeId && context.collegeOverrides && context.collegeId in context.collegeOverrides) {
      const state = context.collegeOverrides[context.collegeId];
      if (state !== undefined) {
        return {
          matched: true,
          enabled: state,
          reason: 'COLLEGE_OVERRIDE_MATCH',
          matchedRule: `${this.name}:College`
        };
      }
    }

    return null;
  }
}
