/**
 * Social Analytics Route
 * GET /api/social/analytics — Fetch aggregated social analytics for a listing
 * POST /api/social/analytics — Trigger manual metrics sync for a listing
 *
 * @authority TIER_5A_SOCIAL_MEDIA_MANAGER_MASTER_INDEX.md
 * @tier ADVANCED
 * @phase Tier 5A Social Media Manager - Phase 9
 * @reference src/app/api/social/posts/route.ts — Canon social API route pattern
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getSocialMediaService } from '@core/services/ServiceRegistry';
import { getDatabaseService } from '@core/services/DatabaseService';
import { withCsrf } from '@/lib/security/withCsrf';

export const GET = apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');

  const url = new URL(context.request.url);
  const listingIdStr = url.searchParams.get('listingId');

  if (!listingIdStr) {
    throw BizError.badRequest('listingId is required');
  }

  const listingId = parseInt(listingIdStr, 10);
  if (isNaN(listingId)) {
    throw BizError.badRequest('listingId must be a valid number');
  }

  // Security: Verify user owns the listing
  const db = getDatabaseService();
  const ownerCheck = await db.query<{ id: number }>(
    'SELECT id FROM listing_users WHERE listing_id = ? AND user_id = ? AND role IN (?, ?)',
    [listingId, user.id, 'owner', 'manager']
  );
  if (ownerCheck.rows.length === 0) {
    throw BizError.forbidden('You do not have permission to view analytics for this listing');
  }

  // Parse date range (default: last 30 days)
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const startDate = url.searchParams.get('startDate') || thirtyDaysAgo.toISOString().split('T')[0]!;
  const endDate = url.searchParams.get('endDate') || today.toISOString().split('T')[0]!;

  const socialService = getSocialMediaService();
  const analyticsData = await socialService.getSocialAnalytics(listingId, startDate, endDate);

  return createSuccessResponse(analyticsData, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET'],
});

async function manualSyncHandler(context: ApiContext) {
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');

  const body = await context.request.json() as { listingId?: number };
  const listingId = body.listingId;

  if (!listingId || typeof listingId !== 'number') {
    throw BizError.badRequest('listingId is required');
  }

  // Security: Verify user owns the listing
  const db = getDatabaseService();
  const ownerCheck = await db.query<{ id: number }>(
    'SELECT id FROM listing_users WHERE listing_id = ? AND user_id = ? AND role IN (?, ?)',
    [listingId, user.id, 'owner', 'manager']
  );
  if (ownerCheck.rows.length === 0) {
    throw BizError.forbidden('You do not have permission to sync metrics for this listing');
  }

  const socialService = getSocialMediaService();
  const result = await socialService.syncAllPostMetrics(listingId);

  // Fire-and-forget analytics
  try {
    const { getInternalAnalyticsService } = await import('@core/services/ServiceRegistry');
    const analytics = getInternalAnalyticsService();
    void analytics.trackEvent({
      eventName: 'social_metrics_sync_triggered',
      userId: user.id,
      eventData: { listingId, synced: result.synced, failed: result.failed },
    });
  } catch { /* fire-and-forget */ }

  return createSuccessResponse(result, context.requestId);
}

export const POST = withCsrf(apiHandler(manualSyncHandler, {
  requireAuth: true,
  allowedMethods: ['POST'],
}));
