/**
 * ListingEmailTemplateRenderer - User-Created Listing Email Templates
 *
 * Renders listing-specific email templates with Bizconekt branding.
 * Follows the exact pattern from ClaimEmailTemplateRenderer.
 *
 * @authority Phase 5 Brain Plan - Notification System
 * @tier ADVANCED
 * @phase Listing Approval System Phase 5
 */

// ============================================================================
// Bizconekt Brand Colors (shared from ClaimEmailTemplateRenderer)
// ============================================================================

const BRAND = {
  primary: '#ed6437',
  secondary: '#1a1a2e',
  background: '#f5f5f5',
  text: '#333333',
  lightText: '#666666',
  border: '#e0e0e0',
  white: '#ffffff',
  success: '#16a34a',
  warning: '#f59e0b'
};

// ============================================================================
// Tier Information (shared from ClaimEmailTemplateRenderer)
// ============================================================================

const TIER_INFO = {
  essentials: {
    displayName: 'Bizconekt Essentials',
    price: 'FREE',
    features: ['6 gallery images', '1 video', '4 offers', '4 events', 'Basic business profile']
  },
  plus: {
    displayName: 'Bizconekt Plus',
    price: '$49/month',
    features: ['12 gallery images', '10 videos', 'HTML descriptions', 'Enhanced visibility']
  },
  preferred: {
    displayName: 'Bizconekt Preferred',
    price: '$129/month',
    features: ['100 gallery images', 'Featured placement', 'Priority support', 'Advanced analytics']
  },
  premium: {
    displayName: 'Bizconekt Premium',
    price: '$299/month',
    features: ['Unlimited features', 'Sponsorship opportunities', 'VIP support', 'Custom branding']
  }
};

// ============================================================================
// Template Data Interfaces
// ============================================================================

export interface ListingSubmittedTemplateData {
  userName: string;
  listingName: string;
  estimatedDays: number;
  statusUrl: string;
  unsubscribeUrl: string;
  preferencesUrl: string;
}

export interface ListingApprovedTemplateData {
  userName: string;
  listingName: string;
  listingId: number;
  tier: 'essentials' | 'plus' | 'preferred' | 'premium';
  manageListingUrl: string;
  upgradeUrl: string;
  completenessPercent?: number;
  unsubscribeUrl: string;
  preferencesUrl: string;
}

export interface ListingRejectedTemplateData {
  userName: string;
  listingName: string;
  listingId: number;
  rejectionReason: string;
  editUrl: string;
  supportEmail: string;
  unsubscribeUrl: string;
  preferencesUrl: string;
}

export interface AdminListingAlertData {
  listingId: number;
  listingName: string;
  ownerName: string;
  ownerEmail: string;
  category: string;
  reviewUrl: string;
}

// ============================================================================
// ListingEmailTemplateRenderer
// ============================================================================

export class ListingEmailTemplateRenderer {

  /**
   * Render listing submitted email (user confirmation)
   */
  renderListingSubmittedEmail(data: ListingSubmittedTemplateData): {
    subject: string;
    html: string;
    text: string;
  } {
    const subject = `Your listing "${data.listingName}" is under review | Bizconekt`;

    const html = this.wrapInLayout(`
      <tr>
        <td style="padding: 30px;">
          <h1 style="color: ${BRAND.secondary}; font-size: 24px; margin: 0 0 20px 0;">
            Listing Submitted
          </h1>

          <p style="color: ${BRAND.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Hi ${this.escapeHtml(data.userName)},
          </p>

          <p style="color: ${BRAND.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Thank you for creating your listing <strong>${this.escapeHtml(data.listingName)}</strong> on Bizconekt!
          </p>

          <div style="background-color: ${BRAND.background}; border-radius: 8px; padding: 20px; margin: 0 0 20px 0;">
            <h3 style="color: ${BRAND.secondary}; font-size: 16px; margin: 0 0 10px 0;">What happens next?</h3>
            <ol style="color: ${BRAND.text}; font-size: 14px; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Our team will review your listing</li>
              <li style="margin-bottom: 8px;">Most listings are approved within ${data.estimatedDays} business days</li>
              <li>You'll receive an email when your listing is live</li>
            </ol>
          </div>

          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background-color: ${BRAND.secondary}; border-radius: 6px;">
                <a href="${this.escapeHtml(data.statusUrl)}"
                   style="display: inline-block; padding: 14px 28px; color: ${BRAND.white}; text-decoration: none; font-weight: 600; font-size: 16px;">
                  View Your Listings
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `, data.unsubscribeUrl, data.preferencesUrl);

    const text = `
Listing Submitted

Hi ${data.userName},

Thank you for creating your listing "${data.listingName}" on Bizconekt!

What happens next?
1. Our team will review your listing
2. Most listings are approved within ${data.estimatedDays} business days
3. You'll receive an email when your listing is live

View Your Listings: ${data.statusUrl}

---
To unsubscribe: ${data.unsubscribeUrl}
Manage preferences: ${data.preferencesUrl}
    `.trim();

    return { subject, html, text };
  }

  /**
   * Render listing approved email (user) - RICH TEMPLATE
   * Congratulations + tier info + upgrade CTA (following ClaimApprovedEmail pattern)
   */
  renderListingApprovedEmail(data: ListingApprovedTemplateData): {
    subject: string;
    html: string;
    text: string;
  } {
    const subject = `Congratulations! "${data.listingName}" is now live on Bizconekt`;
    const tierInfo = TIER_INFO[data.tier] || TIER_INFO.essentials;

    // Upgrade tier suggestions (exclude current tier)
    const upgradeTiers = Object.entries(TIER_INFO)
      .filter(([key]) => key !== data.tier && key !== 'essentials')
      .slice(0, 2); // Show max 2 upgrade options

    const upgradeHtml = upgradeTiers.length > 0 ? `
      <tr>
        <td style="padding: 0 30px 30px 30px;">
          <div style="background-color: ${BRAND.primary}10; border: 1px solid ${BRAND.primary}30; border-radius: 8px; padding: 20px;">
            <h3 style="color: ${BRAND.secondary}; font-size: 18px; margin: 0 0 15px 0;">
              Upgrade Your Listing
            </h3>
            <p style="color: ${BRAND.text}; font-size: 14px; margin: 0 0 15px 0;">
              Get more visibility and features for your business:
            </p>
            ${upgradeTiers.map(([, info]) => `
              <div style="background-color: ${BRAND.white}; border-radius: 6px; padding: 15px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <strong style="color: ${BRAND.secondary};">${info.displayName}</strong>
                  <span style="color: ${BRAND.primary}; font-weight: 600;">${info.price}</span>
                </div>
                <p style="color: ${BRAND.lightText}; font-size: 13px; margin: 0;">
                  ${info.features.slice(0, 2).join(' • ')}
                </p>
              </div>
            `).join('')}
            <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 15px;">
              <tr>
                <td style="background-color: ${BRAND.primary}; border-radius: 6px;">
                  <a href="${this.escapeHtml(data.upgradeUrl)}"
                     style="display: inline-block; padding: 12px 24px; color: ${BRAND.white}; text-decoration: none; font-weight: 600; font-size: 14px;">
                    View Upgrade Options
                  </a>
                </td>
              </tr>
            </table>
          </div>
        </td>
      </tr>
    ` : '';

    const completenessHtml = data.completenessPercent !== undefined ? `
      <div style="background-color: ${BRAND.warning}10; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <p style="color: ${BRAND.text}; font-size: 14px; margin: 0;">
          <strong>Your listing is ${data.completenessPercent}% complete.</strong>
          Add photos, hours, and a description to help customers find you!
        </p>
      </div>
    ` : '';

    const html = this.wrapInLayout(`
      <tr>
        <td style="padding: 30px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 20px;">🎉</div>
          <h1 style="color: ${BRAND.success}; font-size: 28px; margin: 0 0 20px 0;">
            Congratulations!
          </h1>

          <p style="color: ${BRAND.text}; font-size: 16px; line-height: 1.6; margin: 0 0 10px 0;">
            Hi ${this.escapeHtml(data.userName)},
          </p>

          <p style="color: ${BRAND.text}; font-size: 18px; line-height: 1.6; margin: 0 0 25px 0;">
            Your listing <strong>${this.escapeHtml(data.listingName)}</strong> has been approved!<br>
            It's now live on Bizconekt and ready to connect with customers.
          </p>
        </td>
      </tr>

      <tr>
        <td style="padding: 0 30px 20px 30px;">
          <div style="background-color: ${BRAND.background}; border-radius: 8px; padding: 20px;">
            <h3 style="color: ${BRAND.secondary}; font-size: 16px; margin: 0 0 10px 0;">
              YOUR LISTING TIER: ${tierInfo.displayName} (${tierInfo.price})
            </h3>
            <ul style="color: ${BRAND.text}; font-size: 14px; margin: 0; padding-left: 20px;">
              ${tierInfo.features.map(f => `<li style="margin-bottom: 6px;">${f}</li>`).join('')}
            </ul>
          </div>
          ${completenessHtml}
        </td>
      </tr>

      <tr>
        <td style="padding: 0 30px 30px 30px; text-align: center;">
          <table cellpadding="0" cellspacing="0" border="0" align="center">
            <tr>
              <td style="background-color: ${BRAND.success}; border-radius: 6px;">
                <a href="${this.escapeHtml(data.manageListingUrl)}"
                   style="display: inline-block; padding: 16px 32px; color: ${BRAND.white}; text-decoration: none; font-weight: 600; font-size: 16px;">
                  Manage Your Listing
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      ${upgradeHtml}
    `, data.unsubscribeUrl, data.preferencesUrl);

    const text = `
CONGRATULATIONS!

Hi ${data.userName},

Your listing "${data.listingName}" has been approved!
It's now live on Bizconekt and ready to connect with customers.

YOUR LISTING TIER: ${tierInfo.displayName} (${tierInfo.price})
${tierInfo.features.map(f => `- ${f}`).join('\n')}

${data.completenessPercent !== undefined ? `Your listing is ${data.completenessPercent}% complete. Add photos, hours, and a description to help customers find you!` : ''}

Manage Your Listing: ${data.manageListingUrl}

UPGRADE YOUR LISTING:
${upgradeTiers.map(([, info]) => `- ${info.displayName} (${info.price}): ${info.features.slice(0, 2).join(', ')}`).join('\n')}

View Upgrade Options: ${data.upgradeUrl}

---
To unsubscribe: ${data.unsubscribeUrl}
Manage preferences: ${data.preferencesUrl}
    `.trim();

    return { subject, html, text };
  }

  /**
   * Render listing rejected email (user)
   */
  renderListingRejectedEmail(data: ListingRejectedTemplateData): {
    subject: string;
    html: string;
    text: string;
  } {
    const subject = `Update on your listing "${data.listingName}" | Bizconekt`;

    const html = this.wrapInLayout(`
      <tr>
        <td style="padding: 30px;">
          <h1 style="color: ${BRAND.secondary}; font-size: 24px; margin: 0 0 20px 0;">
            Listing Update
          </h1>

          <p style="color: ${BRAND.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Hi ${this.escapeHtml(data.userName)},
          </p>

          <p style="color: ${BRAND.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            We've reviewed your listing <strong>${this.escapeHtml(data.listingName)}</strong> and unfortunately we were unable to approve it at this time.
          </p>

          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 0 0 20px 0;">
            <h4 style="color: #991b1b; font-size: 14px; margin: 0 0 8px 0;">Reason:</h4>
            <p style="color: ${BRAND.text}; font-size: 14px; margin: 0;">
              ${this.escapeHtml(data.rejectionReason)}
            </p>
          </div>

          <div style="background-color: ${BRAND.background}; border-radius: 8px; padding: 20px; margin: 0 0 20px 0;">
            <h3 style="color: ${BRAND.secondary}; font-size: 16px; margin: 0 0 10px 0;">What can you do?</h3>
            <ul style="color: ${BRAND.text}; font-size: 14px; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Review the rejection reason above</li>
              <li style="margin-bottom: 8px;">Update your listing to address the issues</li>
              <li>Resubmit your listing for review</li>
            </ul>
          </div>

          <p style="color: ${BRAND.lightText}; font-size: 14px; margin: 0 0 20px 0;">
            If you have questions, please contact our support team at
            <a href="mailto:${data.supportEmail}" style="color: ${BRAND.primary};">${data.supportEmail}</a>.
          </p>

          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background-color: ${BRAND.secondary}; border-radius: 6px;">
                <a href="${this.escapeHtml(data.editUrl)}"
                   style="display: inline-block; padding: 14px 28px; color: ${BRAND.white}; text-decoration: none; font-weight: 600; font-size: 16px;">
                  Edit Your Listing
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `, data.unsubscribeUrl, data.preferencesUrl);

    const text = `
Listing Update

Hi ${data.userName},

We've reviewed your listing "${data.listingName}" and unfortunately we were unable to approve it at this time.

REASON:
${data.rejectionReason}

What can you do?
- Review the rejection reason above
- Update your listing to address the issues
- Resubmit your listing for review

If you have questions, please contact our support team at ${data.supportEmail}.

Edit Your Listing: ${data.editUrl}

---
To unsubscribe: ${data.unsubscribeUrl}
Manage preferences: ${data.preferencesUrl}
    `.trim();

    return { subject, html, text };
  }

  /**
   * Render admin new listing alert email
   */
  renderAdminNewListingAlertEmail(data: AdminListingAlertData): {
    subject: string;
    html: string;
    text: string;
  } {
    const subject = `[Admin] New listing requires review: ${data.listingName}`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; background-color: ${BRAND.background}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: ${BRAND.white}; border-radius: 8px; margin: 0 auto;">
    <tr>
      <td style="padding: 25px; background-color: ${BRAND.secondary}; border-radius: 8px 8px 0 0;">
        <h1 style="color: ${BRAND.white}; font-size: 20px; margin: 0;">New Listing Requires Review</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 25px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="padding: 8px 0;"><strong>Listing ID:</strong></td>
            <td style="padding: 8px 0;">#${data.listingId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Business:</strong></td>
            <td style="padding: 8px 0;">${this.escapeHtml(data.listingName)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Owner:</strong></td>
            <td style="padding: 8px 0;">${this.escapeHtml(data.ownerName)} (${this.escapeHtml(data.ownerEmail)})</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Category:</strong></td>
            <td style="padding: 8px 0;">${this.escapeHtml(data.category)}</td>
          </tr>
        </table>

        <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 20px;">
          <tr>
            <td style="background-color: ${BRAND.primary}; border-radius: 6px;">
              <a href="${this.escapeHtml(data.reviewUrl)}"
                 style="display: inline-block; padding: 12px 24px; color: ${BRAND.white}; text-decoration: none; font-weight: 600;">
                Review Listing
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const text = `
[ADMIN] New Listing Requires Review

Listing ID: #${data.listingId}
Business: ${data.listingName}
Owner: ${data.ownerName} (${data.ownerEmail})
Category: ${data.category}

Review Listing: ${data.reviewUrl}
    `.trim();

    return { subject, html, text };
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private wrapInLayout(content: string, unsubscribeUrl: string, preferencesUrl: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bizconekt</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.background}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${BRAND.background};">
    <tr>
      <td style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" align="center" style="background-color: ${BRAND.white}; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 25px 30px; border-bottom: 1px solid ${BRAND.border};">
              <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com'}/images/logo.png"
                   alt="Bizconekt"
                   height="32"
                   style="display: block;" />
            </td>
          </tr>

          <!-- Content -->
          ${content}

          <!-- Footer -->
          <tr>
            <td style="padding: 25px 30px; background-color: ${BRAND.background}; border-top: 1px solid ${BRAND.border};">
              <p style="color: ${BRAND.lightText}; font-size: 12px; margin: 0 0 10px 0; text-align: center;">
                You received this email because of activity on your Bizconekt account.
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

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export default ListingEmailTemplateRenderer;
