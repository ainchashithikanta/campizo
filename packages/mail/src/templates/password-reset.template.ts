import { renderBaseTemplate, escapeHtml } from './base.template.js';

export interface PasswordResetEmailOptions {
  name: string;
  resetUrl: string;
}

export function renderPasswordResetTemplate(options: PasswordResetEmailOptions): { subject: string; html: string } {
  const safeName = escapeHtml(options.name);
  const subject = 'Reset Your College Hub Password';

  const bodyContent = `
    <h2 style="font-size: 20px; font-weight: 600; color: #111827; margin-top: 0;">Password Reset Request</h2>
    <p>Hi ${safeName},</p>
    <p>We received a request to reset the password for your College Hub account. Click the button below to choose a new password.</p>
    <p style="background-color: #FEE2E2; border-left: 4px solid #EF4444; padding: 12px; font-size: 14px; color: #991B1B; margin: 20px 0;">
      🔒 This single-use reset link expires in 1 hour. If you did not request a password reset, please secure your account immediately.
    </p>
  `;

  const html = renderBaseTemplate({
    title: subject,
    bodyContent,
    actionUrl: options.resetUrl,
    actionText: 'Reset Password'
  });

  return { subject, html };
}
