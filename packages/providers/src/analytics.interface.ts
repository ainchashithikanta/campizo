import type { BaseProvider } from './base.interface.js';

export interface AnalyticsProvider extends BaseProvider {
  readonly type: 'ANALYTICS';
  trackEvent(eventName: string, properties: Record<string, unknown>, userId?: string): Promise<void>;
}
