import { renderBaseTemplate, escapeHtml } from './base.template.js';

export interface EventReminderEmailOptions {
  name: string;
  eventTitle: string;
  eventDate: string;
  location: string;
  eventUrl?: string | undefined;
}

export function renderEventReminderTemplate(options: EventReminderEmailOptions): { subject: string; html: string } {
  const safeName = escapeHtml(options.name);
  const safeEventTitle = escapeHtml(options.eventTitle);
  const safeEventDate = escapeHtml(options.eventDate);
  const safeLocation = escapeHtml(options.location);
  const subject = `Reminder: "${safeEventTitle}" is coming up!`;

  const bodyContent = `
    <h2 style="font-size: 20px; font-weight: 600; color: #111827; margin-top: 0;">Campus Event Reminder</h2>
    <p>Hi ${safeName},</p>
    <p>This is a reminder for your upcoming campus event:</p>
    <div style="background-color: #F3F4F6; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0;"><strong>🎉 Event:</strong> ${safeEventTitle}</p>
      <p style="margin: 0 0 8px 0;"><strong>📅 Date & Time:</strong> ${safeEventDate}</p>
      <p style="margin: 0;"><strong>📍 Location:</strong> ${safeLocation}</p>
    </div>
    <p>We look forward to seeing you there!</p>
  `;

  const html = renderBaseTemplate({
    title: subject,
    bodyContent,
    actionUrl: options.eventUrl || 'http://localhost:3000/connect',
    actionText: 'View Event Details'
  });

  return { subject, html };
}
