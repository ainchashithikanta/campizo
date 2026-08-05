import { ResendMailClient, type MailClientConfig, type SendMailResult } from './client.js';
import { renderWelcomeTemplate } from './templates/welcome.template.js';
import { renderVerificationTemplate } from './templates/verification.template.js';
import { renderPasswordResetTemplate } from './templates/password-reset.template.js';
import { renderPasswordChangedTemplate } from './templates/password-changed.template.js';
import { renderMarketplaceTemplate } from './templates/marketplace.template.js';
import { renderEventReminderTemplate } from './templates/event-reminder.template.js';
import { renderNotificationTemplate } from './templates/notification.template.js';

export interface SendWelcomeEmailOptions {
  to: string;
  name: string;
  loginUrl?: string | undefined;
}

export interface SendVerificationEmailOptions {
  to: string;
  name: string;
  token: string;
  expiresAt?: Date | undefined;
}

export interface SendPasswordResetEmailOptions {
  to: string;
  name: string;
  token: string;
  expiresAt?: Date | undefined;
}

export interface SendPasswordChangedEmailOptions {
  to: string;
  name: string;
  loginUrl?: string | undefined;
}

export interface SendNotificationEmailOptions {
  to: string;
  name: string;
  subject: string;
  message: string;
  actionUrl?: string | undefined;
  actionText?: string | undefined;
}

export interface SendMarketplaceEmailOptions {
  to: string;
  name: string;
  itemTitle: string;
  buyerName: string;
  actionUrl?: string | undefined;
}

export interface SendEventReminderEmailOptions {
  to: string;
  name: string;
  eventTitle: string;
  eventDate: string;
  location: string;
  eventUrl?: string | undefined;
}

export class MailService {
  private client: ResendMailClient;

  constructor(config: MailClientConfig = {}) {
    this.client = new ResendMailClient(config);
  }

  public async sendWelcomeEmail(options: SendWelcomeEmailOptions): Promise<SendMailResult> {
    const { subject, html } = renderWelcomeTemplate({
      name: options.name,
      loginUrl: options.loginUrl || `${this.client.getAppUrl()}/auth/login`
    });

    return this.client.send({ to: options.to, subject, html });
  }

  public async sendVerificationEmail(options: SendVerificationEmailOptions): Promise<SendMailResult> {
    const verificationUrl = `${this.client.getAppUrl()}/auth/verify-email?token=${encodeURIComponent(options.token)}&email=${encodeURIComponent(options.to)}`;

    const { subject, html } = renderVerificationTemplate({
      name: options.name,
      verificationUrl
    });

    return this.client.send({ to: options.to, subject, html });
  }

  public async sendPasswordResetEmail(options: SendPasswordResetEmailOptions): Promise<SendMailResult> {
    const resetUrl = `${this.client.getAppUrl()}/auth/reset-password?token=${encodeURIComponent(options.token)}`;

    const { subject, html } = renderPasswordResetTemplate({
      name: options.name,
      resetUrl
    });

    return this.client.send({ to: options.to, subject, html });
  }

  public async sendPasswordChangedEmail(options: SendPasswordChangedEmailOptions): Promise<SendMailResult> {
    const { subject, html } = renderPasswordChangedTemplate({
      name: options.name,
      loginUrl: options.loginUrl || `${this.client.getAppUrl()}/auth/login`
    });

    return this.client.send({ to: options.to, subject, html });
  }

  public async sendNotification(options: SendNotificationEmailOptions): Promise<SendMailResult> {
    const { subject, html } = renderNotificationTemplate({
      name: options.name,
      subject: options.subject,
      message: options.message,
      actionUrl: options.actionUrl,
      actionText: options.actionText
    });

    return this.client.send({ to: options.to, subject, html });
  }

  public async sendMarketplaceNotification(options: SendMarketplaceEmailOptions): Promise<SendMailResult> {
    const { subject, html } = renderMarketplaceTemplate({
      name: options.name,
      itemTitle: options.itemTitle,
      buyerName: options.buyerName,
      actionUrl: options.actionUrl || `${this.client.getAppUrl()}/marketplace/chat`
    });

    return this.client.send({ to: options.to, subject, html });
  }

  public async sendEventReminder(options: SendEventReminderEmailOptions): Promise<SendMailResult> {
    const { subject, html } = renderEventReminderTemplate({
      name: options.name,
      eventTitle: options.eventTitle,
      eventDate: options.eventDate,
      location: options.location,
      eventUrl: options.eventUrl || `${this.client.getAppUrl()}/connect`
    });

    return this.client.send({ to: options.to, subject, html });
  }
}

export function createMailService(config: MailClientConfig = {}): MailService {
  return new MailService(config);
}

export const mailService = createMailService();
