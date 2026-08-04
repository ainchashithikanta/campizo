import { EvaluationContext, PolicyResult, PolicyEvaluator } from '../policy-engine.js';

export class DependencyPolicy implements PolicyEvaluator {
  public readonly name = 'DependencyPolicy';

  evaluate(context: EvaluationContext): PolicyResult | null {
    if (context.unmetDependencies && context.unmetDependencies.length > 0) {
      return {
        matched: true,
        enabled: false,
        reason: `UNMET_PREREQUISITE_DEPENDENCY: ${context.unmetDependencies.join(', ')}`,
        matchedRule: this.name
      };
    }
    return null;
  }
}
