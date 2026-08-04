import { EvaluationContext, PolicyResult, PolicyEvaluator } from '../policy-engine.js';

export class VersionPolicy implements PolicyEvaluator {
  public readonly name = 'VersionPolicy';

  evaluate(context: EvaluationContext): PolicyResult | null {
    if (context.minAppVersion && context.clientAppVersion) {
      if (context.clientAppVersion < context.minAppVersion) {
        return {
          matched: true,
          enabled: false,
          reason: `CLIENT_VERSION_UNMET: ${context.clientAppVersion} < ${context.minAppVersion}`,
          matchedRule: this.name
        };
      }
    }
    return null;
  }
}
