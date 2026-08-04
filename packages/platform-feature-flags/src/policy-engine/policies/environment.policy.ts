import { EvaluationContext, PolicyResult, PolicyEvaluator } from '../policy-engine.js';

export class EnvironmentPolicy implements PolicyEvaluator {
  public readonly name = 'EnvironmentPolicy';

  evaluate(context: EvaluationContext): PolicyResult | null {
    if (context.disabledEnvironments && context.disabledEnvironments.includes(context.environment)) {
      return {
        matched: true,
        enabled: false,
        reason: `ENVIRONMENT_DISABLED: ${context.environment}`,
        matchedRule: this.name
      };
    }
    return null;
  }
}
