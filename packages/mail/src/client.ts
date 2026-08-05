import { Resend } from 'resend';
import { logger } from '@college-hub/logger';

export interface MailClientConfig {
  apiKey?: string | undefined;
  fromEmail?: string | undefined;
  fromName?: string | undefined;
  appUrl?: string | undefined;
}

export interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  text?: string | undefined;
  replyTo?: string | undefined;
}

export interface SendMailResult {
  id: string;
  success: boolean;
  error?: string | undefined;
}

export class ResendMailClient {
  private resend: Resend | null = null;
  private fromAddress: string;
  private appUrl: string;

  constructor(config: MailClientConfig = {}) {
    const apiKey = config.apiKey || process.env.RESEND_API_KEY;
    const fromEmail = config.fromEmail || process.env.MAIL_FROM || 'noreply@yourdomain.com';
    const fromName = config.fromName || process.env.MAIL_FROM_NAME || 'College Hub';

    this.fromAddress = `${fromName} <${fromEmail}>`;
    this.appUrl = config.appUrl || process.env.APP_URL || 'http://localhost:3000';

    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  public getAppUrl(): string {
    return this.appUrl;
  }

  public async send(params: SendMailParams): Promise<SendMailResult> {
    logger.info({ to: params.to, subject: params.subject }, 'Queuing email dispatch');

    if (!this.resend) {
      const mockId = `mock-email-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      logger.info(
        { to: params.to, subject: params.subject, mockId },
        '[MOCK MAIL DISPATCH] Resend API key omitted; email logged locally.'
      );
      return { id: mockId, success: true };
    }

    try {
      const response = await this.resend.emails.send({
        from: this.fromAddress,
        to: params.to,
        subject: params.subject,
        html: params.html,
        ...(params.text ? { text: params.text } : {}),
        ...(params.replyTo ? { reply_to: params.replyTo } : {})
      });

      if (response.error) {
        logger.error({ to: params.to, err: response.error.message }, 'Resend API returned email error');
        return { id: '', success: false, error: response.error.message };
      }

      const emailId = response.data?.id || `resend-${Date.now()}`;
      logger.info({ to: params.to, emailId }, 'Email dispatched successfully via Resend SDK');
      return { id: emailId, success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ to: params.to, err: errorMessage }, 'Network/Unexpected failure during email dispatch');
      return { id: '', success: false, error: errorMessage };
    }
  }
}
