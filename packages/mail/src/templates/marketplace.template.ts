import { renderBaseTemplate, escapeHtml } from './base.template.js';

export interface MarketplaceEmailOptions {
  name: string;
  itemTitle: string;
  buyerName: string;
  actionUrl?: string | undefined;
}

export function renderMarketplaceTemplate(options: MarketplaceEmailOptions): { subject: string; html: string } {
  const safeName = escapeHtml(options.name);
  const safeItemTitle = escapeHtml(options.itemTitle);
  const safeBuyerName = escapeHtml(options.buyerName);
  const subject = `New Inquiry on your listing: "${safeItemTitle}"`;

  const bodyContent = `
    <h2 style="font-size: 20px; font-weight: 600; color: #111827; margin-top: 0;">New Marketplace Message!</h2>
    <p>Hi ${safeName},</p>
    <p><strong>${safeBuyerName}</strong> has sent an inquiry regarding your marketplace item <strong>"${safeItemTitle}"</strong>.</p>
    <p>Check your College Hub inbox to reply and complete the transaction.</p>
  `;

  const html = renderBaseTemplate({
    title: subject,
    bodyContent,
    actionUrl: options.actionUrl || 'http://localhost:3000/marketplace/chat',
    actionText: 'View Inquiry'
  });

  return { subject, html };
}
