import { renderBaseTemplate, escapeHtml } from './base.template.js';

export interface NotificationEmailOptions {
  name: string;
  subject: string;
  message: string;
  actionUrl?: string | undefined;
  actionText?: string | undefined;
}

export function renderNotificationTemplate(options: NotificationEmailOptions): { subject: string; html: string } {
  const safeName = escapeHtml(options.name);
  const safeSubject = escapeHtml(options.subject);
  const safeMessage = escapeHtml(options.message).replace(/\n/g, '<br>');

  const bodyContent = `
    <h2 style="font-size: 20px; font-weight: 600; color: #111827; margin-top: 0;">Notification from College Hub</h2>
    <p>Hi ${safeName},</p>
    <div style="font-size: 15px; color: #374151; margin: 20px 0; line-height: 1.6;">
      ${safeMessage}
    </div>
  `;

  const html = renderBaseTemplate({
    title: safeSubject,
    bodyContent,
    actionUrl: options.actionUrl,
    actionText: options.actionText || 'View Notification'
  });

  return { subject: options.subject, html };
}
