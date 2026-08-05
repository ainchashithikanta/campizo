export function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface BaseEmailTemplateOptions {
  title: string;
  bodyContent: string;
  preheader?: string | undefined;
  actionUrl?: string | undefined;
  actionText?: string | undefined;
}

export function renderBaseTemplate(options: BaseEmailTemplateOptions): string {
  const safeTitle = escapeHtml(options.title);
  const safePreheader = options.preheader ? escapeHtml(options.preheader) : safeTitle;

  const actionButtonHtml =
    options.actionUrl && options.actionText
      ? `<div style="margin: 28px 0; text-align: center;">
          <a href="${escapeHtml(options.actionUrl)}" style="background-color: #4F46E5; color: #FFFFFF; font-weight: 600; padding: 12px 28px; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
            ${escapeHtml(options.actionText)}
          </a>
        </div>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F9FAFB; margin: 0; padding: 0; color: #111827; }
    .container { max-width: 600px; margin: 40px auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E5E7EB; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background-color: #4F46E5; padding: 24px; text-align: center; }
    .header h1 { color: #FFFFFF; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .content { padding: 32px 24px; font-size: 15px; line-height: 1.6; color: #374151; }
    .footer { background-color: #F3F4F6; padding: 20px; text-align: center; font-size: 12px; color: #6B7280; border-top: 1px solid #E5E7EB; }
    .footer a { color: #4F46E5; text-decoration: none; }
  </style>
</head>
<body>
  <span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${safePreheader}</span>
  <div class="container">
    <div class="header">
      <h1>🎓 College Hub</h1>
    </div>
    <div class="content">
      ${options.bodyContent}
      ${actionButtonHtml}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} College Hub. All rights reserved.</p>
      <p>This email was sent automatically. Please do not reply to this address.</p>
    </div>
  </div>
</body>
</html>`;
}
