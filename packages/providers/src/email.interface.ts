import type { BaseProvider } from './base.interface.js';

export interface EmailProvider extends BaseProvider {
  readonly type: 'EMAIL';
  sendEmail(
    to: string,
    subject: string,
    bodyHtml: string,
    bodyText?: string
  ): Promise<{ success: boolean; messageId: string }>;
}
