import { renderBaseTemplate, escapeHtml } from './base.template.js';

export interface WelcomeEmailOptions {
  name: string;
  loginUrl?: string | undefined;
}

export function renderWelcomeTemplate(options: WelcomeEmailOptions): { subject: string; html: string } {
  const safeName = escapeHtml(options.name);
  const subject = 'Welcome to College Hub! 👋';

  const bodyContent = `
    <h2 style="font-size: 20px; font-weight: 600; color: #111827; margin-top: 0;">Welcome aboard, ${safeName}!</h2>
    <p>We're excited to have you join the College Hub community. Your account has been successfully created.</p>
    <p>Here are a few things you can explore right away:</p>
    <ul style="padding-left: 20px; color: #374151;">
      <li>📚 <strong>Academic Resources</strong>: Access previous year question papers, notes, and syllabus guides.</li>
      <li>🏷️ <strong>Marketplace</strong>: Buy & sell textbooks, electronics, and hostel supplies safely.</li>
      <li>🗣️ <strong>Confessions & Discussions</strong>: Connect anonymously with peers on your campus.</li>
      <li>⭐ <strong>Rate My Professor</strong>: View course reviews and professor insights.</li>
    </ul>
    <p>If you have any questions, our support team is always here to help.</p>
  `;

  const html = renderBaseTemplate({
    title: subject,
    bodyContent,
    actionUrl: options.loginUrl || 'http://localhost:3000/auth/login',
    actionText: 'Explore College Hub'
  });

  return { subject, html };
}
