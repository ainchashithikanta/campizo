export type ProviderType =
  'STORAGE' | 'NOTIFICATION' | 'SEARCH' | 'AI' | 'EMAIL' | 'IMAGE_PROCESSING' | 'ANALYTICS' | 'CAPTCHA' | 'PAYMENT';

export interface ProviderHealth {
  healthy: boolean;
  latencyMs?: number;
  message?: string;
  details?: Record<string, unknown>;
}

export interface BaseProvider {
  readonly name: string;
  readonly type: ProviderType;
  readonly version: string;
  readonly priority?: number; // Lower integer = higher priority (1 is highest)
  initialize(): Promise<void>;
  healthCheck(): Promise<ProviderHealth>;
  dispose?(): Promise<void>;
  getCapabilities(): string[];
}
