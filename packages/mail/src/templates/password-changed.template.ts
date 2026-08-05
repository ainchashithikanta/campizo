import { renderBaseTemplate, escapeHtml } from './base.template.js';

export interface PasswordChangedEmailOptions {
  name: string;
  loginUrl?: string;
}

export function renderPasswordChangedTemplate(options: PasswordChangedEmailOptions): { subject: string; html: string } {
  const safeName = escapeHtml(options.name);
  const subject = 'Security Alert: Your College Hub Password Was Changed';

  const bodyContent = `
    <h2 style="font-size: 20px; font-weight: 600; color: #111827; margin-top: 0;">Password Successfully Changed</h2>
    <p>Hi ${safeName},</p>
    <p>This email confirms that the password for your College Hub account was recently updated.</p>
    <p style="background-color: #ECFDF5; border-left: 4px solid #10B981; padding: 12px; font-size: 14px; color: #065F46; margin: 20px 0;">
      ✅ If you made this change, no further action is required.
    </p>
    <p>If you did <strong>not</strong> change your password, please contact support or reset your password immediately to protect your account.</p>
  `;

  const html = renderBaseTemplate({
    title: subject,
    bodyContent,
    actionUrl: options.loginUrl || 'http://localhost:3000/auth/login',
    actionText: 'Account Login'
  });

  return { subject, html };
}
