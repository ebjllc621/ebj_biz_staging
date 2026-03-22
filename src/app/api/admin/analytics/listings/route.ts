/**
 * GET /api/admin/analytics/listings
 * Platform-wide listing analytics for admin dashboard
 *
 * @tier STANDARD
 * @auth Admin only
 * @response { summary, byTier, byCategory, topPerformers, engagementTrend }
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse
 * - Database: getDatabaseService boundary
 * - bigIntToNumber: ALL COUNT/SUM queries
 *
 * @reference src/app/api/admin/events/kpi/route.ts — canonical admin API pattern
 * @reference src/app/api/admin/listings/statistics/route.ts — getDatabaseService + bigIntToNumber
 * @phase Phase 5B - Advanced Analytics
 * @authority docs/pages/layouts/listings/features/phases/PHASE_5B_BRAIN_PLAN.md
 */

import { getDatabaseService } from '@core/services/DatabaseService';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';

interface CountRow { count: bigint | number }
interface TierRow { tier: string; count: bigint | number }
interface CategoryRow { category_name: string; count: bigint | number }
interface TopPerformerRow {
  id: number;
  name: string;
  tier: string;
  total_views: bigint | number;
  total_engagements: bigint | number;
}
interface TrendRow {
  month: string;
  total_views: bigint | number;
  total_engagements: bigint | number;
}

export const GET = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) throw BizError.unauthorized('Authentication required');
  if (user.role !== 'admin') throw BizError.forbidden('access listing analytics', 'admin');

  const db = getDatabaseService();

  // Parallel queries for all dashboard data
  const [
    totalResult,
    activeResult,
    tierResult,
    categoryResult,
    topPerformersResult,
    trendResult,
    avgEngagementResult,
  ] = await Promise.all([
    // Total listings
    db.query<CountRow>('SELECT COUNT(*) as count FROM listings'),

    // Active listings (updated in last 30 days)
    db.query<CountRow>(
      `SELECT COUNT(*) as count FROM listings
       WHERE last_update >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    ),

    // By tier
    db.query<TierRow>(
      'SELECT tier, COUNT(*) as count FROM listings GROUP BY tier ORDER BY count DESC'
    ),

    // Top 10 categories by listing count
    db.query<CategoryRow>(
      `SELECT c.name AS category_name, COUNT(*) as count
       FROM listings l
       JOIN categories c ON c.id = l.category_id
       WHERE l.category_id IS NOT NULL
       GROUP BY l.category_id, c.name
       ORDER BY count DESC
       LIMIT 10`
    ),

    // Top 10 performing listings (by views in last 30 days)
    db.query<TopPerformerRow>(
      `SELECT l.id, l.name, l.tier,
              COALESCE(SUM(lad.page_views), 0) AS total_views,
              COALESCE(SUM(lad.engagements), 0) AS total_engagements
       FROM listings l
       LEFT JOIN listing_analytics_daily lad
         ON lad.listing_id = l.id
         AND lad.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY l.id, l.name, l.tier
       ORDER BY total_views DESC
       LIMIT 10`
    ),

    // Monthly engagement trend (last 6 months)
    db.query<TrendRow>(
      `SELECT DATE_FORMAT(date, '%Y-%m') AS month,
              SUM(page_views) AS total_views,
              SUM(engagements) AS total_engagements
       FROM listing_analytics_daily
       WHERE date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(date, '%Y-%m')
       ORDER BY month ASC`
    ),

    // Platform average engagement rate
    db.query<{ avg_rate: number }>(
      `SELECT COALESCE(
         AVG(CASE WHEN sub.total_views > 0
           THEN (sub.total_engagements / sub.total_views) * 100
           ELSE 0 END
         ), 0) AS avg_rate
       FROM (
         SELECT listing_id,
                SUM(page_views) AS total_views,
                SUM(engagements) AS total_engagements
         FROM listing_analytics_daily
         WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
         GROUP BY listing_id
       ) sub`
    ),
  ]);

  return createSuccessResponse({
    summary: {
      totalListings: bigIntToNumber(totalResult.rows[0]?.count ?? 0),
      activeListings: bigIntToNumber(activeResult.rows[0]?.count ?? 0),
      avgEngagementRate: Math.round((Number(avgEngagementResult.rows[0]?.avg_rate ?? 0)) * 10) / 10,
    },
    byTier: tierResult.rows.map(r => ({
      tier: r.tier,
      count: bigIntToNumber(r.count),
    })),
    byCategory: categoryResult.rows.map(r => ({
      category: r.category_name,
      count: bigIntToNumber(r.count),
    })),
    topPerformers: topPerformersResult.rows.map(r => ({
      id: r.id,
      name: r.name,
      tier: r.tier,
      views: bigIntToNumber(r.total_views),
      engagements: bigIntToNumber(r.total_engagements),
    })),
    engagementTrend: trendResult.rows.map(r => ({
      month: r.month,
      views: bigIntToNumber(r.total_views),
      engagements: bigIntToNumber(r.total_engagements),
    })),
  }, 200);
});
