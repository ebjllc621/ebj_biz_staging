/**
 * Newsletter Analytics API Route
 * GET /api/dashboard/listings/[listingId]/newsletters/[newsletterId]/analytics
 *
 * Returns analytics summary, subscriber growth, and delivery stats.
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - requireAuth: true
 * - Listing ownership validation
 * - Creator Suite add-on validation
 * - bigIntToNumber on all COUNTs
 * - createSuccessResponse/createErrorResponse
 *
 * @phase Tier 2 Content Types - Phase N8
 * @reference src/app/api/listings/[id]/analytics/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getDatabaseService } from '@core/services/DatabaseService';
import { NewsletterService } from '@core/services/NewsletterService';

function extractIds(url: URL): { listingId: number; newsletterId: number } {
  const segments = url.pathname.split('/');
  const analyticsIndex = segments.indexOf('analytics');
  if (analyticsIndex < 4) {
    throw BizError.badRequest('Invalid URL structure');
  }

  const newsletterIdRaw = segments[analyticsIndex - 1];
  const newsletterId = parseInt(newsletterIdRaw ?? '');
  if (!newsletterIdRaw || isNaN(newsletterId)) {
    throw BizError.badRequest('Invalid newsletter ID');
  }

  const newslettersIndex = segments.indexOf('newsletters');
  const listingIdRaw = segments[newslettersIndex - 1];
  const listingId = parseInt(listingIdRaw ?? '');
  if (!listingIdRaw || isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID');
  }

  return { listingId, newsletterId };
}

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

export const GET = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const url = new URL(context.request.url);
  const { listingId, newsletterId } = extractIds(url);

  const userId = parseInt(context.userId, 10);

  // Check admin
  const db = getDatabaseService();
  const userResult = await db.query<{ role: string }>(
    'SELECT role FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  const isAdmin = userResult.rows[0]?.role === 'admin';

  if (!isAdmin) {
    await verifyListingOwnership(listingId, userId);
    await verifyCreatorSuite(listingId);
  }

  // Verify newsletter belongs to listing
  const ownershipResult = await db.query<{ listing_id: number }>(
    'SELECT listing_id FROM content_newsletters WHERE id = ? LIMIT 1',
    [newsletterId]
  );
  const ownershipRow = ownershipResult.rows[0];
  if (!ownershipResult.rows.length || !ownershipRow || ownershipRow.listing_id !== listingId) {
    throw BizError.forbidden('Newsletter does not belong to this listing');
  }

  // Date range (default: last 30 days)
  const startParam = url.searchParams.get('start');
  const endParam = url.searchParams.get('end');

  const endDate = endParam || new Date().toISOString().split('T')[0]!;
  let startDate: string;
  if (startParam) {
    startDate = startParam;
  } else {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    startDate = d.toISOString().split('T')[0]!;
  }

  const newsletterService = new NewsletterService(db);

  const [analytics, subscriberGrowth, deliveryStats] = await Promise.all([
    newsletterService.getNewsletterAnalytics(newsletterId, startDate, endDate),
    newsletterService.getSubscriberGrowth(listingId, startDate, endDate),
    newsletterService.getDeliveryStats(listingId),
  ]);

  // Get newsletter basic info
  const newsletter = await newsletterService.getNewsletterById(newsletterId);

  return createSuccessResponse({
    analytics,
    subscriberGrowth,
    deliveryStats,
    newsletter: newsletter ? {
      id: newsletter.id,
      title: newsletter.title,
      status: newsletter.status,
      sent_at: newsletter.sent_at?.toISOString() || null,
      subscriber_count_at_send: newsletter.subscriber_count_at_send,
    } : null,
  }, context.requestId);
}, {
  allowedMethods: ['GET'],
  requireAuth: true,
});
