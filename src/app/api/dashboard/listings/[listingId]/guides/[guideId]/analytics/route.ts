/**
 * Guide Analytics API Route
 * GET /api/dashboard/listings/[listingId]/guides/[guideId]/analytics
 *
 * Returns guide analytics summary with KPIs, progress distribution,
 * and per-section completion rates.
 *
 * @phase Tier 2 Content Types - Phase G9B
 * @reference src/app/api/dashboard/listings/[listingId]/newsletters/[newsletterId]/analytics/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getDatabaseService } from '@core/services/DatabaseService';
import { GuideService } from '@core/services/GuideService';

function extractIds(url: URL): { listingId: number; guideId: number } {
  const segments = url.pathname.split('/');
  const analyticsIndex = segments.indexOf('analytics');
  if (analyticsIndex < 4) {
    throw BizError.badRequest('Invalid URL structure');
  }

  const guideIdRaw = segments[analyticsIndex - 1];
  const guideId = parseInt(guideIdRaw ?? '');
  if (!guideIdRaw || isNaN(guideId)) {
    throw BizError.badRequest('Invalid guide ID');
  }

  const guidesIndex = segments.indexOf('guides');
  const listingIdRaw = segments[guidesIndex - 1];
  const listingId = parseInt(listingIdRaw ?? '');
  if (!listingIdRaw || isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID');
  }

  return { listingId, guideId };
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
  const { listingId, guideId } = extractIds(url);

  const userId = parseInt(context.userId, 10);

  // Check admin bypass
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

  // Verify guide belongs to listing
  const ownershipResult = await db.query<{ listing_id: number; title: string; status: string; published_at: string | null }>(
    'SELECT listing_id, title, status, published_at FROM content_guides WHERE id = ? LIMIT 1',
    [guideId]
  );
  const guideRow = ownershipResult.rows[0];
  if (!ownershipResult.rows.length || !guideRow || guideRow.listing_id !== listingId) {
    throw BizError.forbidden('Guide does not belong to this listing');
  }

  const guideService = new GuideService(db);
  const analytics = await guideService.getGuideAnalytics(guideId);

  return createSuccessResponse({
    analytics,
    guide: {
      id: guideId,
      title: guideRow.title,
      status: guideRow.status,
      published_at: guideRow.published_at,
    },
  }, context.requestId);
}, {
  allowedMethods: ['GET'],
  requireAuth: true,
});
