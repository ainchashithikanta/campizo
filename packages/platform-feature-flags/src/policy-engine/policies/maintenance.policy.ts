import { EvaluationContext, PolicyResult, PolicyEvaluator } from '../policy-engine.js';

export class MaintenancePolicy implements PolicyEvaluator {
  public readonly name = 'MaintenancePolicy';

  evaluate(context: EvaluationContext): PolicyResult | null {
    if (context.isMaintenanceActive) {
      return {
        matched: true,
        enabled: false,
        reason: 'MAINTENANCE_WINDOW_ACTIVE',
        matchedRule: this.name
      };
    }
    return null;
  }
}
