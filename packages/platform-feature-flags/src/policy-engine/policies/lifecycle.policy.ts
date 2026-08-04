import { EvaluationContext, PolicyResult, PolicyEvaluator } from '../policy-engine.js';

export class LifecyclePolicy implements PolicyEvaluator {
  public readonly name = 'LifecyclePolicy';

  evaluate(context: EvaluationContext): PolicyResult | null {
    if (context.lifecycleStage === 'REMOVED') {
      return {
        matched: true,
        enabled: false,
        reason: 'FEATURE_STAGE_REMOVED',
        matchedRule: this.name
      };
    }
    if (context.lifecycleStage === 'DRAFT') {
      return {
        matched: true,
        enabled: false,
        reason: 'FEATURE_STAGE_DRAFT',
        matchedRule: this.name
      };
    }
    return null;
  }
}
