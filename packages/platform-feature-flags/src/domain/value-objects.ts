/**
 * Platform Feature Flags Value Objects
 */

export type EnvironmentType = 'DEVELOPMENT' | 'TESTING' | 'STAGING' | 'PRODUCTION';

export type LifecycleStageType =
  'DRAFT' | 'DEVELOPMENT' | 'BETA' | 'INTERNAL' | 'PRODUCTION' | 'DEPRECATED' | 'SCHEDULED_REMOVAL' | 'REMOVED';

export type DependencyType = 'REQUIRED' | 'OPTIONAL' | 'BLOCKING' | 'SOFT';

export type CacheSourceType = 'LOCAL_MEMORY' | 'REDIS_CACHE' | 'FALLBACK_DEFAULT';

export class FeatureKey {
  public readonly value: string;

  constructor(value: string) {
    if (!value || typeof value !== 'string') {
      throw new Error('Feature key must be a non-empty string');
    }
    const trimmed = value.trim();
    if (!/^[a-z0-9_-]+\.[a-z0-9_.-]+$/i.test(trimmed)) {
      throw new Error(`Invalid feature key format: '${trimmed}'. Must follow 'module.feature_name' convention.`);
    }
    this.value = trimmed;
  }

  equals(other: FeatureKey): boolean {
    return this.value === other.value;
  }
}

export class FeatureVersion {
  public readonly value: number;

  constructor(value: number) {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error('Feature version must be a positive integer starting at 1');
    }
    this.value = value;
  }

  next(): FeatureVersion {
    return new FeatureVersion(this.value + 1);
  }
}

export class RolloutPercentage {
  public readonly value: number;

  constructor(value: number) {
    if (typeof value !== 'number' || value < 0 || value > 100) {
      throw new Error('Rollout percentage must be a number between 0 and 100 inclusive');
    }
    this.value = Math.floor(value);
  }
}

export class Environment {
  public readonly value: EnvironmentType;

  constructor(value: EnvironmentType) {
    const valid: EnvironmentType[] = ['DEVELOPMENT', 'TESTING', 'STAGING', 'PRODUCTION'];
    if (!valid.includes(value)) {
      throw new Error(`Invalid environment: ${value}`);
    }
    this.value = value;
  }
}

export class FeatureLifecycle {
  public readonly value: LifecycleStageType;

  constructor(value: LifecycleStageType) {
    const valid: LifecycleStageType[] = [
      'DRAFT',
      'DEVELOPMENT',
      'BETA',
      'INTERNAL',
      'PRODUCTION',
      'DEPRECATED',
      'SCHEDULED_REMOVAL',
      'REMOVED'
    ];
    if (!valid.includes(value)) {
      throw new Error(`Invalid lifecycle stage: ${value}`);
    }
    this.value = value;
  }

  isEvaluatable(): boolean {
    return this.value !== 'REMOVED' && this.value !== 'DRAFT';
  }
}

export interface ExplanationDetails {
  decisionExplanation: string;
  skippedRules: string[];
  evaluationTimeline: Array<{ policy: string; outcome: string; durationMs: number }>;
}

export class EvaluationResult {
  public readonly enabled: boolean;
  public readonly reason: string;
  public readonly matchedRule: string;
  public readonly evaluationTimeMs: number;
  public readonly cacheSource: CacheSourceType;
  public readonly evaluatedEnvironment: EnvironmentType;
  public readonly traceId: string;
  public readonly configurationVersion: number;
  public readonly policyExecutionCount: number;
  public readonly explanation?: ExplanationDetails | undefined;

  constructor(params: {
    enabled: boolean;
    reason: string;
    matchedRule: string;
    evaluationTimeMs: number;
    cacheSource: CacheSourceType;
    evaluatedEnvironment: EnvironmentType;
    traceId?: string | undefined;
    configurationVersion?: number | undefined;
    policyExecutionCount?: number | undefined;
    explanation?: ExplanationDetails | undefined;
  }) {
    this.enabled = params.enabled;
    this.reason = params.reason;
    this.matchedRule = params.matchedRule;
    this.evaluationTimeMs = params.evaluationTimeMs;
    this.cacheSource = params.cacheSource;
    this.evaluatedEnvironment = params.evaluatedEnvironment;
    this.traceId = params.traceId || `trace_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.configurationVersion = params.configurationVersion ?? 1;
    this.policyExecutionCount = params.policyExecutionCount ?? 1;
    if (params.explanation !== undefined) {
      this.explanation = params.explanation;
    }
  }
}

export class ApprovalDecision {
  public readonly reviewerUserId: string;
  public readonly decision: 'APPROVED' | 'REJECTED';
  public readonly note?: string | undefined;
  public readonly timestamp: string;

  constructor(params: {
    reviewerUserId: string;
    decision: 'APPROVED' | 'REJECTED';
    note?: string | undefined;
    timestamp?: string | undefined;
  }) {
    if (!params.reviewerUserId) throw new Error('Reviewer user ID is required');
    this.reviewerUserId = params.reviewerUserId;
    this.decision = params.decision;
    if (params.note !== undefined) this.note = params.note;
    this.timestamp = params.timestamp || new Date().toISOString();
  }
}

export class SnapshotReference {
  public readonly snapshotId: string;
  public readonly hmacSignature: string;

  constructor(snapshotId: string, hmacSignature: string) {
    if (!snapshotId) throw new Error('Snapshot ID is required');
    if (!hmacSignature) throw new Error('HMAC signature is required');
    this.snapshotId = snapshotId;
    this.hmacSignature = hmacSignature;
  }
}

export class FeatureOwner {
  public readonly teamName: string;
  public readonly leadEmail: string;

  constructor(teamName: string, leadEmail: string) {
    if (!teamName) throw new Error('Team name is required');
    if (!leadEmail || !leadEmail.includes('@')) throw new Error('Valid lead email is required');
    this.teamName = teamName;
    this.leadEmail = leadEmail;
  }
}

export class Reason {
  public readonly value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Reason string must not be empty');
    }
    this.value = value.trim();
  }
}

export class FeaturePack {
  public readonly packKey: string;
  public readonly memberFlagKeys: string[];

  constructor(packKey: string, memberFlagKeys: string[]) {
    if (!packKey) throw new Error('Pack key is required');
    if (!Array.isArray(memberFlagKeys) || memberFlagKeys.length === 0) {
      throw new Error('Feature pack must contain at least one member flag key');
    }
    this.packKey = packKey;
    this.memberFlagKeys = memberFlagKeys;
  }
}

export class FeatureTemplate {
  public readonly templateKey: string;
  public readonly presetName: 'BETA' | 'INTERNAL' | 'EXPERIMENTAL' | 'PRODUCTION' | 'EMERGENCY';

  constructor(templateKey: string, presetName: 'BETA' | 'INTERNAL' | 'EXPERIMENTAL' | 'PRODUCTION' | 'EMERGENCY') {
    if (!templateKey) throw new Error('Template key is required');
    this.templateKey = templateKey;
    this.presetName = presetName;
  }
}
