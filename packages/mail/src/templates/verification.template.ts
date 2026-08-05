import { renderBaseTemplate, escapeHtml } from './base.template.js';

export interface VerificationEmailOptions {
  name: string;
  verificationUrl: string;
}

export function renderVerificationTemplate(options: VerificationEmailOptions): { subject: string; html: string } {
  const safeName = escapeHtml(options.name);
  const subject = 'Verify your College Hub Email Address';

  const bodyContent = `
    <h2 style="font-size: 20px; font-weight: 600; color: #111827; margin-top: 0;">Verify your email address</h2>
    <p>Hi ${safeName},</p>
    <p>Please click the button below to verify your college email address and complete your registration on College Hub.</p>
    <p style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; font-size: 14px; color: #92400E; margin: 20px 0;">
      ⚠️ This verification link will expire in 24 hours for security purposes.
    </p>
    <p>If you did not sign up for a College Hub account, you can safely ignore this email.</p>
  `;

  const html = renderBaseTemplate({
    title: subject,
    bodyContent,
    actionUrl: options.verificationUrl,
    actionText: 'Verify Email Address'
  });

  return { subject, html };
}
