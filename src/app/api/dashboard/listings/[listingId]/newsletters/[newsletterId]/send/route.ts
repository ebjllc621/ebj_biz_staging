/**
 * Newsletter Send API Route
 * POST /api/dashboard/listings/[listingId]/newsletters/[newsletterId]/send
 *
 * Sends a newsletter to all active subscribers.
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - withCsrf: MANDATORY for POST
 * - getUserFromRequest: MANDATORY for auth
 * - Listing ownership validation
 * - Creator Suite add-on validation
 * - Newsletter-listing ownership validation
 *
 * @authority CLAUDE.md - API Standards
 * @phase Tier 2 Content Types - Phase N7B
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { withCsrf } from '@/lib/security/withCsrf';
import { getDatabaseService } from '@core/services/DatabaseService';
import { NewsletterService } from '@core/services/NewsletterService';
import { getMailSender } from '@core/services/email/MailSender';
import { renderNewsletterEmail } from '@core/services/email/NewsletterEmailTemplate';
import { getContentNotificationService } from '@core/services/notification/ContentNotificationService';
import { ErrorService } from '@core/services/ErrorService';

// ============================================================================
// Helper: Extract listingId and newsletterId from URL
// ============================================================================

function extractIds(url: URL): { listingId: number; newsletterId: number } {
  const segments = url.pathname.split('/');
  // /api/dashboard/listings/[listingId]/newsletters/[newsletterId]/send
  const sendIndex = segments.indexOf('send');
  if (sendIndex < 4) {
    throw BizError.badRequest('Invalid URL structure');
  }

  const newsletterIdRaw = segments[sendIndex - 1];
  const newsletterId = parseInt(newsletterIdRaw ?? '');
  if (!newsletterIdRaw || isNaN(newsletterId)) {
    throw BizError.badRequest('Invalid newsletter ID');
  }

  // listingId is before "newsletters" segment
  const newslettersIndex = segments.indexOf('newsletters');
  const listingIdRaw = segments[newslettersIndex - 1];
  const listingId = parseInt(listingIdRaw ?? '');
  if (!listingIdRaw || isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID');
  }

  return { listingId, newsletterId };
}

// ============================================================================
// Helper: Verify user owns the listing
// ============================================================================

async function verifyListingOwnership(listingId: number, userId: number): Promise<void> {
  const db = getDatabaseService();
  const result = await db.query<{ user_id: number }>(
    'SELECT user_id FROM listings WHERE id = ? LIMIT 1',
    [listingId]
  );
  const row = result.rows[0];
  if (!result.rows.length || !row || row.user_id !== userId) {
    throw BizError.forbidden('Not your listing');
  }
}

// ============================================================================
// Helper: Verify Creator Suite add-on is active
// ============================================================================

async function verifyCreatorSuite(listingId: number): Promise<void> {
  const db = getDatabaseService();
  const result = await db.query<{ id: number }>(
    `SELECT lsa.id
     FROM listing_subscription_addons lsa
     JOIN listing_subscriptions ls ON lsa.listing_subscription_id = ls.id
     JOIN addon_suites as2 ON lsa.addon_suite_id = as2.id
     WHERE ls.listing_id = ?
       AND as2.suite_name = 'creator'
       AND lsa.status = 'active'
     LIMIT 1`,
    [listingId]
  );
  if (!result.rows.length) {
    throw BizError.forbidden('Creator Suite add-on required');
  }
}

// ============================================================================
// POST — Send newsletter to subscribers
// ============================================================================

export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const { listingId, newsletterId } = extractIds(url);

  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  await verifyListingOwnership(listingId, user.id);
  await verifyCreatorSuite(listingId);

  // Verify newsletter belongs to this listing
  const db = getDatabaseService();
  const ownershipResult = await db.query<{ listing_id: number }>(
    'SELECT listing_id FROM content_newsletters WHERE id = ? LIMIT 1',
    [newsletterId]
  );
  const ownershipRow = ownershipResult.rows[0];
  if (!ownershipResult.rows.length || !ownershipRow || ownershipRow.listing_id !== listingId) {
    throw BizError.forbidden('Newsletter does not belong to this listing');
  }

  // Get listing name for email template
  const listingResult = await db.query<{ name: string }>(
    'SELECT name FROM listings WHERE id = ? LIMIT 1',
    [listingId]
  );
  const listingName = listingResult.rows[0]?.name || 'Business';

  // Send newsletter (marks as published, returns subscribers)
  const newsletterService = new NewsletterService(db);
  const { newsletter, subscribers } = await newsletterService.sendNewsletter(newsletterId);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_ORIGIN || 'https://bizconekt.com';
  const mailSender = getMailSender();

  // Email delivery — best-effort per subscriber
  let successCount = 0;
  let failCount = 0;

  const emailContent = newsletter.email_html || newsletter.web_content || '';
  const webArchiveUrl = `${baseUrl}/newsletters/${newsletter.slug}`;

  for (const subscriber of subscribers) {
    try {
      // Use subscriber's confirmation_token for unsubscribe (or generate placeholder)
      const unsubscribeUrl = subscriber.confirmation_token
        ? `${baseUrl}/newsletters/unsubscribe?token=${subscriber.confirmation_token}`
        : `${baseUrl}/newsletters/unsubscribe?email=${encodeURIComponent(subscriber.email)}&listing=${listingId}`;

      const { subject, html, text } = renderNewsletterEmail({
        title: newsletter.title,
        content: emailContent,
        excerpt: newsletter.excerpt ?? undefined,
        featuredImage: newsletter.featured_image ?? undefined,
        issueNumber: newsletter.issue_number ?? undefined,
        readingTime: newsletter.reading_time ?? undefined,
        slug: newsletter.slug || '',
        listingName,
        unsubscribeUrl,
        webArchiveUrl,
        // Phase N8: Per-subscriber tracking
        newsletterId: newsletter.id,
        subscriberId: subscriber.id,
        trackingBaseUrl: baseUrl,
      });

      await mailSender.send({
        to: subscriber.email,
        subject,
        html,
        text,
      });

      successCount++;
    } catch (error) {
      failCount++;
      ErrorService.capture('[Newsletter Send] Failed to send to subscriber', {
        newsletterId,
        subscriberEmail: '***', // Don't log PII
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Notify listing followers via in-app notification (best-effort)
  try {
    const contentNotificationService = getContentNotificationService();
    await contentNotificationService.notifyContentPublished('newsletter', newsletterId, listingId);
  } catch (error) {
    ErrorService.capture('[Newsletter Send] Failed to send content notifications', { newsletterId, error });
  }

  return createSuccessResponse({
    sent: successCount,
    failed: failCount,
    subscriberCount: subscribers.length,
    newsletter: { id: newsletter.id, title: newsletter.title, status: newsletter.status },
  }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
}));
