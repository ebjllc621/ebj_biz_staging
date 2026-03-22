/**
 * GET /api/listings/[id]/analytics/funnel - Listing Engagement Funnel API
 *
 * @tier API_ROUTE
 * @phase Phase 2A - Analytics Enhancement
 * @authority docs/pages/layouts/listings/features/phases/PHASE_2A_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST use apiHandler wrapper with requireAuth: true
 * - MUST use bigIntToNumber for COUNT(*) results
 * - MUST authorize: user owns listing or is admin
 * - Primary data: EngagementFunnelService (engagement_funnel_events)
 * - Fallback: aggregate from existing analytics tables if no funnel events
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getEngagementFunnelService } from '@core/services/EngagementFunnelService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';

export const GET = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const db = getDatabaseService();

  // Extract listing ID from URL
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const listingIdStr = pathParts[pathParts.indexOf('listings') + 1];

  if (!listingIdStr) {
    throw BizError.badRequest('Listing ID is required');
  }

  const listingId = parseInt(listingIdStr, 10);

  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID');
  }

  // Verify ownership
  const ownershipResult = await db.query<{ user_id: number }>(
    'SELECT user_id FROM listings WHERE id = ?',
    [listingId]
  );

  if (ownershipResult.rows.length === 0) {
    throw BizError.notFound('Listing not found');
  }

  const isOwner = ownershipResult.rows[0]?.user_id === parseInt(context.userId, 10);

  // Check if admin
  const userResult = await db.query<{ role: string }>(
    'SELECT role FROM users WHERE id = ?',
    [parseInt(context.userId, 10)]
  );
  const isAdmin = userResult.rows[0]?.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw BizError.forbidden('You do not have permission to view analytics');
  }

  // Parse date range
  const startDateParam = url.searchParams.get('start');
  const endDateParam = url.searchParams.get('end');

  let endDate: Date;
  if (endDateParam) {
    endDate = new Date(endDateParam);
    endDate.setHours(23, 59, 59, 999);
  } else {
    endDate = new Date();
  }

  let startDate: Date;
  if (startDateParam) {
    startDate = new Date(startDateParam);
    startDate.setHours(0, 0, 0, 0);
  } else {
    startDate = new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000));
    startDate.setHours(0, 0, 0, 0);
  }

  // Primary: use EngagementFunnelService
  const funnelService = getEngagementFunnelService();
  const funnelData = await funnelService.getFunnelData('listing', listingId, {
    start: startDate,
    end: endDate
  });

  // If funnel events exist, return them directly
  if (funnelData.total_events > 0) {
    const stages = funnelData.stages.map(s => ({
      stage: s.stage,
      count: s.count,
      conversion_rate: s.conversion_rate > 0 ? s.conversion_rate : null
    }));

    // Fix: first stage has no conversion rate
    if (stages.length > 0 && stages[0]) {
      stages[0].conversion_rate = null;
    }

    return createSuccessResponse({
      stages,
      overall_conversion_rate: funnelData.overall_conversion_rate,
      total_events: funnelData.total_events,
      date_range: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      }
    }, context.requestId);
  }

  // Fallback: aggregate from existing analytics tables
  let pageViewCount = 0;
  let engagementCount = 0;
  let conversionCount = 0;

  try {
    const viewsResult = await db.query<{ count: bigint }>(
      `SELECT COUNT(*) as count FROM analytics_listing_views
       WHERE listing_id = ? AND created_at >= ? AND created_at <= ?`,
      [listingId, startDate, endDate]
    );
    pageViewCount = bigIntToNumber(viewsResult.rows[0]?.count ?? 0n);
  } catch {
    pageViewCount = 0;
  }

  try {
    const engResult = await db.query<{ count: bigint }>(
      `SELECT COUNT(*) as count FROM analytics_events
       WHERE listing_id = ? AND created_at >= ? AND created_at <= ?`,
      [listingId, startDate, endDate]
    );
    engagementCount = bigIntToNumber(engResult.rows[0]?.count ?? 0n);
  } catch {
    engagementCount = 0;
  }

  try {
    const convResult = await db.query<{ count: bigint }>(
      `SELECT COUNT(*) as count FROM analytics_conversions
       WHERE listing_id = ? AND created_at >= ? AND created_at <= ?`,
      [listingId, startDate, endDate]
    );
    conversionCount = bigIntToNumber(convResult.rows[0]?.count ?? 0n);
  } catch {
    conversionCount = 0;
  }

  // Build fallback funnel stages
  const viewRate = pageViewCount > 0 && pageViewCount > 0
    ? Math.round((pageViewCount / Math.max(pageViewCount, 1)) * 100 * 10) / 10
    : null;
  const engRate = pageViewCount > 0
    ? Math.round((engagementCount / pageViewCount) * 100 * 10) / 10
    : null;
  const convRate = engagementCount > 0
    ? Math.round((conversionCount / engagementCount) * 100 * 10) / 10
    : null;

  const fallbackStages = [
    { stage: 'impression', count: 0, conversion_rate: null },
    { stage: 'page_view', count: pageViewCount, conversion_rate: viewRate },
    { stage: 'engagement', count: engagementCount, conversion_rate: engRate },
    { stage: 'conversion', count: conversionCount, conversion_rate: convRate },
    { stage: 'follow', count: 0, conversion_rate: null }
  ];

  const totalFallbackEvents = pageViewCount + engagementCount + conversionCount;
  const overallRate = pageViewCount > 0
    ? Math.round((conversionCount / pageViewCount) * 100 * 10) / 10
    : 0;

  return createSuccessResponse({
    stages: fallbackStages,
    overall_conversion_rate: overallRate,
    total_events: totalFallbackEvents,
    date_range: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    }
  }, context.requestId);
}, {
  allowedMethods: ['GET'],
  requireAuth: true
});
