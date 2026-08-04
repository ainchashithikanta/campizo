import { EvaluationContext, PolicyResult, PolicyEvaluator } from '../policy-engine.js';

export class KillSwitchPolicy implements PolicyEvaluator {
  public readonly name = 'KillSwitchPolicy';

  evaluate(context: EvaluationContext): PolicyResult | null {
    if (context.isKillSwitchActive) {
      return {
        matched: true,
        enabled: false,
        reason: 'KILL_SWITCH_ACTIVE',
        matchedRule: this.name
      };
    }
    return null;
  }
}
