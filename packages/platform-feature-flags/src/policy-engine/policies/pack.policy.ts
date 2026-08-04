import { EvaluationContext, PolicyResult, PolicyEvaluator } from '../policy-engine.js';

export class PackPolicy implements PolicyEvaluator {
  public readonly name = 'PackPolicy';

  evaluate(context: EvaluationContext): PolicyResult | null {
    if (context.packOverrideState !== undefined) {
      return {
        matched: true,
        enabled: context.packOverrideState,
        reason: `PACK_OVERRIDE_${context.packOverrideState ? 'ENABLED' : 'DISABLED'}`,
        matchedRule: this.name
      };
    }
    return null;
  }
}
