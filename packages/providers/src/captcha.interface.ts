import type { BaseProvider } from './base.interface.js';

export interface CaptchaProvider extends BaseProvider {
  readonly type: 'CAPTCHA';
  verifyToken(token: string, userIp?: string): Promise<{ valid: boolean; score?: number }>;
}
