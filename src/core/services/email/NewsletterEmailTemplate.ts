/**
 * NewsletterEmailTemplate - Newsletter-specific email rendering
 *
 * Renders newsletter content as a branded email with unsubscribe footer.
 * Distinct from EmailTemplateRenderer (which renders notification alerts).
 *
 * GOVERNANCE COMPLIANCE:
 * - Import paths: Uses @core/ aliases
 * - Bizconekt branding: Same BRAND colors as EmailTemplateRenderer
 * - Security: HTML content passed through (assumed sanitized at input)
 *
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier2_Phases/PHASE_N7B_NEWSLETTER_PREVIEW_SEND.md
 * @tier STANDARD
 * @phase Tier 2 Content Types - Phase N7B
 */

// ============================================================================
// Bizconekt Brand Colors (matches EmailTemplateRenderer)
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
// Types
// ============================================================================

export interface NewsletterEmailData {
  title: string;
  content: string;            // email_html or web_content
  excerpt?: string;
  featuredImage?: string;
  issueNumber?: number;
  readingTime?: number;
  slug: string;
  listingName: string;
  unsubscribeUrl: string;
  webArchiveUrl: string;
  // Phase N8: Tracking fields (only present during actual send, not preview)
  newsletterId?: number;
  subscriberId?: number;
  trackingBaseUrl?: string;
}

// ============================================================================
// Tracking Helpers (Phase N8)
// ============================================================================

/**
 * Wrap content links with click tracking redirects.
 * Only wraps links in the content section — NOT unsubscribe, web archive, or header links.
 */
function wrapLinksWithTracking(
  contentHtml: string,
  trackingBaseUrl: string,
  newsletterId: number,
  subscriberId: number
): string {
  return contentHtml.replace(
    /<a\s([^>]*?)href="(https?:\/\/[^"]+)"([^>]*?)>/gi,
    (match, before: string, href: string, after: string) => {
      // Skip links already wrapped with tracking
      if (href.includes('/api/newsletters/track/')) return match;
      const trackedUrl = `${trackingBaseUrl}/api/newsletters/track/click?nid=${newsletterId}&sid=${subscriberId}&url=${encodeURIComponent(href)}`;
      return `<a ${before}href="${trackedUrl}"${after}>`;
    }
  );
}

// ============================================================================
// Render Function
// ============================================================================

/**
 * Render newsletter content as a branded email
 *
 * @returns { subject, html, text } ready for MailSender.send()
 */
export function renderNewsletterEmail(data: NewsletterEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_ORIGIN || 'https://bizconekt.com';

  const subject = `${data.title} — ${data.listingName}`;

  const trackingBaseUrl = data.trackingBaseUrl || baseUrl;

  // Wrap content links with click tracking (only when sending, not preview)
  let processedContent = data.content;
  if (data.newsletterId && data.subscriberId) {
    processedContent = wrapLinksWithTracking(processedContent, trackingBaseUrl, data.newsletterId, data.subscriberId);
  }

  // Tracking pixel (only when sending, not preview)
  const trackingPixelHtml = (data.newsletterId && data.subscriberId)
    ? `<!-- Open Tracking Pixel -->
          <tr>
            <td>
              <img src="${trackingBaseUrl}/api/newsletters/track/open?nid=${data.newsletterId}&sid=${data.subscriberId}"
                   width="1" height="1" alt="" style="display:none;" />
            </td>
          </tr>`
    : '';

  // Meta line (issue number + reading time)
  const metaParts: string[] = [];
  if (data.issueNumber) metaParts.push(`Issue #${data.issueNumber}`);
  if (data.readingTime) metaParts.push(`${data.readingTime} min read`);
  const metaLine = metaParts.length > 0
    ? `<p style="color: ${BRAND.lightText}; font-size: 13px; margin: 0 0 20px 0;">${escapeHtml(metaParts.join(' · '))}</p>`
    : '';

  // Featured image
  const featuredImageHtml = data.featuredImage
    ? `<img src="${escapeHtml(data.featuredImage)}" alt="${escapeHtml(data.title)}" style="width: 100%; max-width: 600px; height: auto; border-radius: 8px; margin-bottom: 20px; display: block;" />`
    : '';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(data.title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.background}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${BRAND.background};">
    <tr>
      <td style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" align="center" style="background-color: ${BRAND.white}; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header with orange gradient -->
          <tr>
            <td style="padding: 25px 30px; background: linear-gradient(135deg, ${BRAND.primary}, #f07c5a); border-radius: 8px 8px 0 0;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <img src="${baseUrl}/images/logo.png" alt="Bizconekt" height="32" style="display: block;" />
                  </td>
                  <td style="text-align: right;">
                    <span style="color: ${BRAND.white}; font-size: 13px; opacity: 0.9;">${escapeHtml(data.listingName)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Newsletter Title -->
          <tr>
            <td style="padding: 30px 30px 0 30px;">
              <h1 style="color: ${BRAND.secondary}; font-size: 28px; line-height: 1.3; margin: 0 0 10px 0;">
                ${escapeHtml(data.title)}
              </h1>
              ${metaLine}
            </td>
          </tr>

          <!-- Featured Image -->
          ${featuredImageHtml ? `<tr><td style="padding: 0 30px 20px 30px;">${featuredImageHtml}</td></tr>` : ''}

          <!-- Newsletter Content Body -->
          <tr>
            <td style="padding: 0 30px 30px 30px; color: ${BRAND.text}; font-size: 16px; line-height: 1.7;">
              ${processedContent}
            </td>
          </tr>

          <!-- View in Browser Link -->
          <tr>
            <td style="padding: 0 30px 30px 30px; text-align: center;">
              <a href="${escapeHtml(data.webArchiveUrl)}"
                 style="display: inline-block; padding: 12px 24px; background-color: ${BRAND.primary}; color: ${BRAND.white}; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                View in Browser
              </a>
            </td>
          </tr>

          ${trackingPixelHtml}

          <!-- Unsubscribe Footer -->
          <tr>
            <td style="padding: 25px 30px; background-color: ${BRAND.background}; border-top: 1px solid ${BRAND.border}; border-radius: 0 0 8px 8px;">
              <p style="color: ${BRAND.lightText}; font-size: 12px; margin: 0 0 10px 0; text-align: center;">
                You received this email because you subscribed to newsletters from ${escapeHtml(data.listingName)}.
              </p>
              <p style="color: ${BRAND.lightText}; font-size: 12px; margin: 0; text-align: center;">
                <a href="${escapeHtml(data.unsubscribeUrl)}" style="color: ${BRAND.primary}; text-decoration: none;">Unsubscribe</a>
                &nbsp;|&nbsp;
                <a href="${escapeHtml(data.webArchiveUrl)}" style="color: ${BRAND.primary}; text-decoration: none;">View Online</a>
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

  // Plain text version
  const text = `
${data.title}
${data.listingName}
${metaParts.join(' · ')}

${stripHtml(processedContent)}

View in browser: ${data.webArchiveUrl}

---
You received this email because you subscribed to newsletters from ${data.listingName}.
Unsubscribe: ${data.unsubscribeUrl}

© ${new Date().getFullYear()} Bizconekt. All rights reserved.
  `.trim();

  return { subject, html, text };
}

// ============================================================================
// Helpers
// ============================================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
