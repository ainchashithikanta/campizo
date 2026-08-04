import { EvaluationContext, PolicyResult, PolicyEvaluator } from '../policy-engine.js';

export class RolloutPolicy implements PolicyEvaluator {
  public readonly name = 'RolloutPolicy';

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  evaluate(context: EvaluationContext): PolicyResult | null {
    if (context.rolloutPercentage !== undefined && context.rolloutPercentage > 0) {
      if (context.rolloutPercentage >= 100) {
        return {
          matched: true,
          enabled: true,
          reason: 'ROLLOUT_100_PERCENT',
          matchedRule: this.name
        };
      }

      if (context.userId) {
        const hashInput = `${context.userId}:${context.flagKey}`;
        const bucket = this.simpleHash(hashInput) % 100;
        const isMatched = bucket < context.rolloutPercentage;
        return {
          matched: true,
          enabled: isMatched,
          reason: isMatched ? 'ROLLOUT_PERCENTAGE_MATCH' : 'ROLLOUT_PERCENTAGE_EXCLUDED',
          matchedRule: `${this.name}:Bucket_${bucket}`
        };
      }
    }
    return null;
  }
}
