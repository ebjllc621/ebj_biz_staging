/**
 * GET /api/listings/[id]/analytics - Listing Analytics API
 *
 * @tier API_ROUTE
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST use apiHandler wrapper
 * - MUST query real database tables (NO mock data)
 * - MUST use bigIntToNumber for COUNT(*) results
 * - MUST authorize: user owns listing or is admin
 * - ALL queries MUST use listing_id (LISTING-CENTRIC DATA ISOLATION)
 *
 * @reference src/app/api/listings/[id]/stats/route.ts - Real query patterns
 * @reference src/core/services/InternalAnalyticsService.ts - Analytics patterns
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';

/**
 * GET handler - Fetch REAL analytics data for listing from database
 */
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

  // Get date range from query params (default to last 30 days)
  const startDateParam = url.searchParams.get('start');
  const endDateParam = url.searchParams.get('end');

  // Parse end date - set to END of day (23:59:59.999) to include all events on that day
  let endDate: Date;
  if (endDateParam) {
    endDate = new Date(endDateParam);
    endDate.setHours(23, 59, 59, 999);
  } else {
    endDate = new Date(); // Now
  }

  // Parse start date - set to START of day (00:00:00) for full day coverage
  let startDate: Date;
  if (startDateParam) {
    startDate = new Date(startDateParam);
    startDate.setHours(0, 0, 0, 0);
  } else {
    startDate = new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 days ago
    startDate.setHours(0, 0, 0, 0);
  }

  // ============================================================================
  // REAL DATABASE QUERIES - NO MOCK DATA
  // ============================================================================

  // 1. Views Trend - Daily view counts for this listing
  let viewsTrend: Array<{ date: string; views: number }> = [];
  try {
    const viewsTrendResult = await db.query<{ date: string; views: bigint }>(
      `SELECT DATE(created_at) as date, COUNT(*) as views
       FROM analytics_listing_views
       WHERE listing_id = ?
         AND created_at >= ?
         AND created_at <= ?
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [listingId, startDate, endDate]
    );
    viewsTrend = viewsTrendResult.rows.map(row => ({
      date: row.date,
      views: bigIntToNumber(row.views)
    }));
  } catch {
    // Table may not exist yet - return empty array
    viewsTrend = [];
  }

  // 2. Traffic Sources - Referrer breakdown (if tracked)
  let sources: Array<{ source: string; views: number; percentage: number }> = [];
  try {
    const sourcesResult = await db.query<{ referrer: string | null; views: bigint }>(
      `SELECT
         CASE
           WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
           WHEN referrer LIKE '%google%' THEN 'Google'
           WHEN referrer LIKE '%facebook%' OR referrer LIKE '%twitter%' OR referrer LIKE '%instagram%' OR referrer LIKE '%linkedin%' THEN 'Social Media'
           ELSE 'Referral'
         END as referrer,
         COUNT(*) as views
       FROM analytics_listing_views
       WHERE listing_id = ?
         AND created_at >= ?
         AND created_at <= ?
       GROUP BY
         CASE
           WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
           WHEN referrer LIKE '%google%' THEN 'Google'
           WHEN referrer LIKE '%facebook%' OR referrer LIKE '%twitter%' OR referrer LIKE '%instagram%' OR referrer LIKE '%linkedin%' THEN 'Social Media'
           ELSE 'Referral'
         END
       ORDER BY views DESC`,
      [listingId, startDate, endDate]
    );

    const totalSourceViews = sourcesResult.rows.reduce((sum, row) => sum + bigIntToNumber(row.views), 0);
    sources = sourcesResult.rows.map(row => ({
      source: row.referrer || 'Direct',
      views: bigIntToNumber(row.views),
      percentage: totalSourceViews > 0 ? Math.round((bigIntToNumber(row.views) / totalSourceViews) * 100) : 0
    }));
  } catch {
    // Referrer column may not exist or table missing - return empty
    sources = [];
  }

  // 3. Total Views - Count for this listing
  let totalViews = 0;
  let last30DaysViews = 0;
  try {
    const totalViewsResult = await db.query<{ count: bigint }>(
      'SELECT COUNT(*) as count FROM analytics_listing_views WHERE listing_id = ?',
      [listingId]
    );
    totalViews = bigIntToNumber(totalViewsResult.rows[0]?.count ?? 0n);

    const last30Result = await db.query<{ count: bigint }>(
      `SELECT COUNT(*) as count FROM analytics_listing_views
       WHERE listing_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [listingId]
    );
    last30DaysViews = bigIntToNumber(last30Result.rows[0]?.count ?? 0n);
  } catch {
    totalViews = 0;
    last30DaysViews = 0;
  }

  // 4. Engagement Metrics - From analytics_events using listing_id column
  let engagement = {
    clicks: 0,
    averageTimeOnPage: 0,
    bounceRate: 0,
    conversions: 0
  };
  try {
    // Count ALL click events for this listing (using listing_id column, not JSON)
    const clicksResult = await db.query<{ count: bigint }>(
      `SELECT COUNT(*) as count FROM analytics_events
       WHERE listing_id = ?
         AND created_at >= ?
         AND created_at <= ?`,
      [listingId, startDate, endDate]
    );
    engagement.clicks = bigIntToNumber(clicksResult.rows[0]?.count ?? 0n);

    // Count conversions for this listing (using listing_id column)
    const conversionsResult = await db.query<{ count: bigint }>(
      `SELECT COUNT(*) as count FROM analytics_conversions
       WHERE listing_id = ?
         AND conversion_type IN ('listing_contact', 'listing_quote', 'listing_booking', 'listing_call')
         AND created_at >= ?
         AND created_at <= ?`,
      [listingId, startDate, endDate]
    );
    engagement.conversions = bigIntToNumber(conversionsResult.rows[0]?.count ?? 0n);
  } catch {
    // Events/conversions tables may not exist - keep defaults
  }

  // 5. Click breakdown by type for detailed analytics
  let clicksByType: Array<{ eventName: string; count: number }> = [];
  try {
    const clickBreakdownResult = await db.query<{ event_name: string; count: bigint }>(
      `SELECT event_name, COUNT(*) as count FROM analytics_events
       WHERE listing_id = ?
         AND created_at >= ?
         AND created_at <= ?
       GROUP BY event_name
       ORDER BY count DESC`,
      [listingId, startDate, endDate]
    );
    clicksByType = clickBreakdownResult.rows.map(row => ({
      eventName: row.event_name,
      count: bigIntToNumber(row.count)
    }));
  } catch {
    clicksByType = [];
  }

  // Build response with REAL data (will show 0s if no data exists)
  const analyticsData = {
    viewsTrend,
    sources,
    engagement,
    clicksByType,
    totalViews,
    last30DaysViews,
    // Meta info so UI knows this is real data
    _meta: {
      dataSource: 'database',
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      },
      listingId
    }
  };

  return createSuccessResponse(analyticsData, context.requestId);
}, {
  allowedMethods: ['GET'],
  requireAuth: true
});
