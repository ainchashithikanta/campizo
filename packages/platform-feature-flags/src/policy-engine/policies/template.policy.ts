import { EvaluationContext, PolicyResult, PolicyEvaluator } from '../policy-engine.js';

export class TemplatePolicy implements PolicyEvaluator {
  public readonly name = 'TemplatePolicy';

  evaluate(context: EvaluationContext): PolicyResult | null {
    if (context.templateEnforcedState !== undefined) {
      return {
        matched: true,
        enabled: context.templateEnforcedState,
        reason: `TEMPLATE_ENFORCED_${context.templateEnforcedState ? 'ENABLED' : 'DISABLED'}`,
        matchedRule: this.name
      };
    }
    return null;
  }
}
