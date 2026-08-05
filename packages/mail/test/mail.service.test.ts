import { describe, it, expect } from 'vitest';
import {
  MailService,
  createMailService,
  renderBaseTemplate,
  renderWelcomeTemplate,
  renderVerificationTemplate,
  renderPasswordResetTemplate,
  renderPasswordChangedTemplate,
  renderMarketplaceTemplate,
  renderEventReminderTemplate,
  renderNotificationTemplate
} from '../src/index.js';

describe('@college-hub/mail Package & Resend Integration', () => {
  it('renders base template with escaped HTML and action buttons', () => {
    const html = renderBaseTemplate({
      title: 'Test Email <Script>',
      bodyContent: '<p>Hello World</p>',
      actionUrl: 'http://localhost:3000/action?x=1&y=2',
      actionText: 'Click <Here>'
    });

    expect(html).toContain('Test Email &lt;Script&gt;');
    expect(html).toContain('<p>Hello World</p>');
    expect(html).toContain('http://localhost:3000/action?x=1&amp;y=2');
    expect(html).toContain('Click &lt;Here&gt;');
  });

  it('renders welcome template correctly', () => {
    const { subject, html } = renderWelcomeTemplate({
      name: 'John Doe',
      loginUrl: 'http://localhost:3000/login'
    });

    expect(subject).toBe('Welcome to College Hub! 👋');
    expect(html).toContain('John Doe');
    expect(html).toContain('http://localhost:3000/login');
  });

  it('renders verification template with token URL', () => {
    const { subject, html } = renderVerificationTemplate({
      name: 'Jane Smith',
      verificationUrl: 'http://localhost:3000/auth/verify-email?token=sec-token-123'
    });

    expect(subject).toBe('Verify your College Hub Email Address');
    expect(html).toContain('Jane Smith');
    expect(html).toContain('http://localhost:3000/auth/verify-email?token=sec-token-123');
  });

  it('renders password reset template with one-time reset URL', () => {
    const { subject, html } = renderPasswordResetTemplate({
      name: 'Alice',
      resetUrl: 'http://localhost:3000/auth/reset-password?token=reset-abc-999'
    });

    expect(subject).toBe('Reset Your College Hub Password');
    expect(html).toContain('Alice');
    expect(html).toContain('http://localhost:3000/auth/reset-password?token=reset-abc-999');
  });

  it('MailService dispatches welcome email safely in mock mode', async () => {
    const mailService = createMailService({ appUrl: 'http://localhost:3000' });
    const result = await mailService.sendWelcomeEmail({
      to: 'student@stanford.edu',
      name: 'Stanford Student'
    });

    expect(result.success).toBe(true);
    expect(result.id).toContain('mock-email-');
  });

  it('MailService constructs secure verification links in sendVerificationEmail', async () => {
    const mailService = new MailService({ appUrl: 'https://collegehub.edu' });
    const result = await mailService.sendVerificationEmail({
      to: 'user@mit.edu',
      name: 'MIT User',
      token: 'secret-token-xyz'
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it('MailService dispatches marketplace, event reminder, and system notifications', async () => {
    const mailService = createMailService();

    const mpResult = await mailService.sendMarketplaceNotification({
      to: 'seller@stanford.edu',
      name: 'Seller',
      itemTitle: 'Calculus Textbook',
      buyerName: 'Buyer Bob'
    });
    expect(mpResult.success).toBe(true);

    const eventResult = await mailService.sendEventReminder({
      to: 'attendee@mit.edu',
      name: 'Attendee',
      eventTitle: 'Hackathon 2026',
      eventDate: 'Tomorrow at 10 AM',
      location: 'Student Center'
    });
    expect(eventResult.success).toBe(true);

    const notifResult = await mailService.sendNotification({
      to: 'student@stanford.edu',
      name: 'Student',
      subject: 'Important Announcement',
      message: 'Campus library hours have been updated.'
    });
    expect(notifResult.success).toBe(true);
  });
});
