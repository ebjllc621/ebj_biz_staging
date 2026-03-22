/**
 * GET /api/listings/[id]/analytics/trends - Listing Time-Series Analytics API
 *
 * @tier API_ROUTE
 * @phase Phase 2A - Analytics Enhancement
 * @authority docs/pages/layouts/listings/features/phases/PHASE_2A_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST use apiHandler wrapper with requireAuth: true
 * - MUST use bigIntToNumber for COUNT(*) results
 * - MUST authorize: user owns listing or is admin
 * - Returns daily/weekly/monthly time-series across multiple metrics
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';

interface TrendRow {
  date: string;
  page_views: bigint | number;
  engagements: bigint | number;
  conversions: bigint | number;
  shares: bigint | number;
}

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
  const period = url.searchParams.get('period') ?? 'daily';

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

  // Determine date grouping format based on period
  let dateGroupFormat: string;
  if (period === 'weekly') {
    dateGroupFormat = "DATE_FORMAT(d, '%Y-%u')";
  } else if (period === 'monthly') {
    dateGroupFormat = "DATE_FORMAT(d, '%Y-%m')";
  } else {
    dateGroupFormat = "DATE_FORMAT(d, '%Y-%m-%d')";
  }

  // Build time-series from raw analytics tables
  let trends: Array<{
    date: string;
    page_views: number;
    engagements: number;
    conversions: number;
    shares: number;
  }> = [];

  try {
    // Generate a date series and LEFT JOIN each metric table
    const trendsResult = await db.query<TrendRow>(
      `SELECT
         ${dateGroupFormat.replace(/d\b/g, 'alv.created_at')} AS date,
         COUNT(DISTINCT alv.id) AS page_views,
         COALESCE(SUM(ae_count.cnt), 0) AS engagements,
         COALESCE(SUM(ac_count.cnt), 0) AS conversions,
         COALESCE(SUM(ls_count.cnt), 0) AS shares
       FROM analytics_listing_views alv
       LEFT JOIN (
         SELECT DATE(created_at) AS d, COUNT(*) AS cnt
         FROM analytics_events
         WHERE listing_id = ? AND created_at >= ? AND created_at <= ?
         GROUP BY DATE(created_at)
       ) ae_count ON DATE(alv.created_at) = ae_count.d
       LEFT JOIN (
         SELECT DATE(created_at) AS d, COUNT(*) AS cnt
         FROM analytics_conversions
         WHERE listing_id = ? AND created_at >= ? AND created_at <= ?
         GROUP BY DATE(created_at)
       ) ac_count ON DATE(alv.created_at) = ac_count.d
       LEFT JOIN (
         SELECT DATE(created_at) AS d, COUNT(*) AS cnt
         FROM listing_shares
         WHERE listing_id = ? AND created_at >= ? AND created_at <= ?
         GROUP BY DATE(created_at)
       ) ls_count ON DATE(alv.created_at) = ls_count.d
       WHERE alv.listing_id = ?
         AND alv.created_at >= ?
         AND alv.created_at <= ?
       GROUP BY DATE(alv.created_at)
       ORDER BY DATE(alv.created_at) ASC`,
      [
        listingId, startDate, endDate,
        listingId, startDate, endDate,
        listingId, startDate, endDate,
        listingId, startDate, endDate
      ]
    );

    trends = trendsResult.rows.map(row => ({
      date: String(row.date),
      page_views: bigIntToNumber(row.page_views),
      engagements: bigIntToNumber(row.engagements),
      conversions: bigIntToNumber(row.conversions),
      shares: bigIntToNumber(row.shares)
    }));
  } catch {
    trends = [];
  }

  return createSuccessResponse({
    trends,
    period,
    date_range: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    }
  }, context.requestId);
}, {
  allowedMethods: ['GET'],
  requireAuth: true
});
