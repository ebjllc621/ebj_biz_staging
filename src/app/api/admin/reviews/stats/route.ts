/**
 * Admin Reviews Stats API Route
 *
 * GET /api/admin/reviews/stats - Aggregate review statistics across ALL review tables
 *
 * Response matches ReviewStats interface in admin reviews page:
 *   total, approved, pending, rejected, testimonials, avgRating, byRating
 *
 * Uses UNION ALL across all review tables for complete system-wide stats.
 *
 * @authority PHASE_2_BRAIN_PLAN.md Task 2.2
 * @tier STANDARD
 */

import { apiHandler, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';

interface StatsRow {
  total: bigint | number | null;
  approved: bigint | number | null;
  pending: bigint | number | null;
  rejected: bigint | number | null;
  testimonials: bigint | number | null;
  avgRating: number | null;
  r1: bigint | number | null;
  r2: bigint | number | null;
  r3: bigint | number | null;
  r4: bigint | number | null;
  r5: bigint | number | null;
}

export const GET = apiHandler(async (context) => {
  const db = getDatabaseService();

  // UNION ALL across every review table for system-wide stats
  // COLLATE utf8mb4_unicode_ci normalizes collation (creator tables use utf8mb4_general_ci)
  const allReviewsUnion = `
    SELECT rating, status COLLATE utf8mb4_unicode_ci as status, is_featured FROM reviews
    UNION ALL
    SELECT rating, status COLLATE utf8mb4_unicode_ci as status, CAST(is_testimonial_approved AS SIGNED) as is_featured FROM event_reviews
    UNION ALL
    SELECT rating, 'approved' COLLATE utf8mb4_unicode_ci as status, 0 as is_featured FROM offer_reviews
    UNION ALL
    SELECT rating, COALESCE(status, 'approved') COLLATE utf8mb4_unicode_ci as status, 0 as is_featured FROM content_ratings
    UNION ALL
    SELECT rating, status COLLATE utf8mb4_unicode_ci as status, 0 as is_featured FROM affiliate_marketer_reviews
    UNION ALL
    SELECT rating, status COLLATE utf8mb4_unicode_ci as status, 0 as is_featured FROM internet_personality_reviews
    UNION ALL
    SELECT rating, status COLLATE utf8mb4_unicode_ci as status, 0 as is_featured FROM podcaster_reviews
  `;

  const result = await db.query<StatsRow>(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN is_featured = 1 THEN 1 ELSE 0 END) as testimonials,
      AVG(CASE WHEN status = 'approved' THEN rating ELSE NULL END) as avgRating,
      SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as r1,
      SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as r2,
      SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as r3,
      SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as r4,
      SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as r5
    FROM (${allReviewsUnion}) all_reviews
  `, []);

  const row = result.rows[0];

  const stats = {
    total: bigIntToNumber(row?.total),
    approved: bigIntToNumber(row?.approved),
    pending: bigIntToNumber(row?.pending),
    rejected: bigIntToNumber(row?.rejected),
    testimonials: bigIntToNumber(row?.testimonials),
    avgRating: row?.avgRating != null ? Math.round(Number(row.avgRating) * 10) / 10 : 0,
    byRating: {
      1: bigIntToNumber(row?.r1),
      2: bigIntToNumber(row?.r2),
      3: bigIntToNumber(row?.r3),
      4: bigIntToNumber(row?.r4),
      5: bigIntToNumber(row?.r5)
    }
  };

  return createSuccessResponse(stats, context.requestId);
}, { requireAuth: true, allowedMethods: ['GET'] });
