/**
 * EmailTemplateRenderer - HTML/Text Email Template Rendering
 *
 * Renders notification emails using built-in templates with Bizconekt branding.
 *
 * @authority docs/notificationService/phases/PHASE_4_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import {
  ImmediateEmailTemplateData,
  DigestEmailTemplateData
} from './email-types';

// ============================================================================
// Bizconekt Brand Colors
// ============================================================================

const BRAND = {
  primary: '#ed6437',      // Bizconekt orange
  secondary: '#1a1a2e',    // Dark navy
  background: '#f5f5f5',   // Light gray
  text: '#333333',         // Dark text
  lightText: '#666666',    // Secondary text
  border: '#e0e0e0',       // Border gray
  white: '#ffffff'
};

// ============================================================================
// Email Template Renderer
// ============================================================================

export class EmailTemplateRenderer {

  /**
   * Render immediate notification email
   */
  renderImmediateEmail(data: ImmediateEmailTemplateData): {
    subject: string;
    html: string;
    text: string;
  } {
    const subject = `${data.title} | Bizconekt`;

    const html = this.wrapInLayout(`
      <tr>
        <td style="padding: 30px;">
          <h1 style="color: ${BRAND.secondary}; font-size: 24px; margin: 0 0 20px 0;">
            ${this.escapeHtml(data.title)}
          </h1>

          <p style="color: ${BRAND.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Hi ${this.escapeHtml(data.userName)},
          </p>

          <p style="color: ${BRAND.text}; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
            ${this.escapeHtml(data.message)}
          </p>

          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background-color: ${BRAND.primary}; border-radius: 6px;">
                <a href="${this.escapeHtml(data.actionUrl)}"
                   style="display: inline-block; padding: 14px 28px; color: ${BRAND.white}; text-decoration: none; font-weight: 600; font-size: 16px;">
                  ${this.escapeHtml(data.actionText)}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `, data.unsubscribeUrl, data.preferencesUrl);

    const text = `
${data.title}

Hi ${data.userName},

${data.message}

${data.actionText}: ${data.actionUrl}

---
To unsubscribe from these emails, visit: ${data.unsubscribeUrl}
Manage your notification preferences: ${data.preferencesUrl}
    `.trim();

    return { subject, html, text };
  }

  /**
   * Render digest email
   */
  renderDigestEmail(data: DigestEmailTemplateData): {
    subject: string;
    html: string;
    text: string;
  } {
    const subject = `Your ${data.frequency} digest: ${data.totalCount} updates | Bizconekt`;

    const categoriesHtml = data.categories.map(cat => `
      <tr>
        <td style="padding: 0 30px 20px 30px;">
          <h2 style="color: ${BRAND.secondary}; font-size: 18px; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 1px solid ${BRAND.border};">
            ${this.escapeHtml(cat.categoryLabel)} (${cat.notifications.length})
          </h2>

          ${cat.notifications.map(notif => `
            <div style="margin-bottom: 15px; padding: 15px; background-color: ${BRAND.background}; border-radius: 6px;">
              <p style="color: ${BRAND.text}; font-size: 14px; font-weight: 600; margin: 0 0 5px 0;">
                ${this.escapeHtml(notif.title)}
              </p>
              ${notif.message ? `
                <p style="color: ${BRAND.lightText}; font-size: 13px; margin: 0 0 10px 0;">
                  ${this.escapeHtml(notif.message.substring(0, 150))}${notif.message.length > 150 ? '...' : ''}
                </p>
              ` : ''}
              ${notif.actionUrl ? `
                <a href="${this.escapeHtml(notif.actionUrl)}"
                   style="color: ${BRAND.primary}; font-size: 13px; text-decoration: none; font-weight: 500;">
                  View details &rarr;
                </a>
              ` : ''}
            </div>
          `).join('')}
        </td>
      </tr>
    `).join('');

    const html = this.wrapInLayout(`
      <tr>
        <td style="padding: 30px;">
          <h1 style="color: ${BRAND.secondary}; font-size: 24px; margin: 0 0 10px 0;">
            Your ${data.frequency} digest
          </h1>
          <p style="color: ${BRAND.lightText}; font-size: 14px; margin: 0 0 20px 0;">
            ${this.escapeHtml(data.periodDescription)}
          </p>

          <p style="color: ${BRAND.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Hi ${this.escapeHtml(data.userName)}, here's what you missed:
          </p>
        </td>
      </tr>

      ${categoriesHtml}

      <tr>
        <td style="padding: 20px 30px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="background-color: ${BRAND.primary}; border-radius: 6px; text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com'}/dashboard/notifications"
                   style="display: inline-block; padding: 14px 28px; color: ${BRAND.white}; text-decoration: none; font-weight: 600; font-size: 16px;">
                  View All Notifications
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `, data.unsubscribeUrl, data.preferencesUrl);

    // Plain text version
    const categoriesText = data.categories.map(cat => `
## ${cat.categoryLabel} (${cat.notifications.length})

${cat.notifications.map(notif => `- ${notif.title}
  ${notif.message ? notif.message.substring(0, 100) + '...' : ''}
  ${notif.actionUrl ? `View: ${notif.actionUrl}` : ''}`).join('\n\n')}
    `).join('\n\n');

    const text = `
Your ${data.frequency} digest - ${data.periodDescription}

Hi ${data.userName}, here's what you missed:

${categoriesText}

---
View all notifications: ${process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com'}/dashboard/notifications

To unsubscribe from these emails, visit: ${data.unsubscribeUrl}
Manage your notification preferences: ${data.preferencesUrl}
    `.trim();

    return { subject, html, text };
  }

  /**
   * Wrap content in email layout
   */
  private wrapInLayout(content: string, unsubscribeUrl: string, preferencesUrl: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bizconekt Notification</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.background}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${BRAND.background};">
    <tr>
      <td style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" align="center" style="background-color: ${BRAND.white}; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 25px 30px; border-bottom: 1px solid ${BRAND.border};">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com'}/images/logo.png"
                         alt="Bizconekt"
                         height="32"
                         style="display: block;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          ${content}

          <!-- Footer -->
          <tr>
            <td style="padding: 25px 30px; background-color: ${BRAND.background}; border-top: 1px solid ${BRAND.border};">
              <p style="color: ${BRAND.lightText}; font-size: 12px; margin: 0 0 10px 0; text-align: center;">
                You received this email because you have notifications enabled on Bizconekt.
              </p>
              <p style="color: ${BRAND.lightText}; font-size: 12px; margin: 0; text-align: center;">
                <a href="${this.escapeHtml(unsubscribeUrl)}" style="color: ${BRAND.primary}; text-decoration: none;">Unsubscribe</a>
                &nbsp;|&nbsp;
                <a href="${this.escapeHtml(preferencesUrl)}" style="color: ${BRAND.primary}; text-decoration: none;">Notification Preferences</a>
              </p>
              <p style="color: ${BRAND.lightText}; font-size: 11px; margin: 15px 0 0 0; text-align: center;">
                &copy; ${new Date().getFullYear()} Bizconekt. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Escape HTML entities
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export default EmailTemplateRenderer;
