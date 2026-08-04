/**
 * FeatureFlagService with Runtime Toggles
 */
export interface FeatureFlags {
  enableDistributedTracing: boolean;
  enableAdaptiveRateLimiting: boolean;
  enableExternalSearchProvider: boolean;
  enableAiModeration: boolean;
  enablePrometheusMetrics: boolean;
  enableChaosSimulations: boolean;
}

export class FeatureFlagService {
  private flags: FeatureFlags;

  constructor(initialFlags: Partial<FeatureFlags> = {}) {
    this.flags = {
      enableDistributedTracing: true,
      enableAdaptiveRateLimiting: true,
      enableExternalSearchProvider: false,
      enableAiModeration: false,
      enablePrometheusMetrics: true,
      enableChaosSimulations: false,
      ...initialFlags
    };
  }

  isEnabled(flag: keyof FeatureFlags): boolean {
    return !!this.flags[flag];
  }

  setFlag(flag: keyof FeatureFlags, enabled: boolean): void {
    this.flags[flag] = enabled;
  }

  getFlags(): FeatureFlags {
    return { ...this.flags };
  }
}
