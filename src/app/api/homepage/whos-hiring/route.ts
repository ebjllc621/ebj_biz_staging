/**
 * Who's Hiring Homepage Section API Route
 *
 * GET /api/homepage/whos-hiring - Get featured jobs for homepage section
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';

interface FeaturedJob {
  id: number;
  title: string;
  slug: string;
  employment_type: string;
  work_location_type: string;
  city: string | null;
  state: string | null;
  compensation_min: number | null;
  compensation_max: number | null;
  is_featured: boolean;
  business_id: number;
  listing_name: string;
  listing_logo_url: string | null;
  created_at: Date;
}

/**
 * GET /api/homepage/whos-hiring
 * Get featured and recent active jobs for homepage section
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const url = new URL(context.request.url);
  const limit = parseInt(url.searchParams.get('limit') || '8', 10);

  // Get featured jobs first, then recent active jobs
  const query = `
    SELECT
      jp.id,
      jp.title,
      jp.slug,
      jp.employment_type,
      jp.work_location_type,
      jp.city,
      jp.state,
      jp.compensation_min,
      jp.compensation_max,
      jp.is_featured,
      jp.business_id,
      l.name as listing_name,
      l.logo_url as listing_logo_url,
      jp.created_at
    FROM job_postings jp
    INNER JOIN listings l ON jp.business_id = l.id
    WHERE jp.status = 'active'
    ORDER BY jp.is_featured DESC, jp.created_at DESC
    LIMIT ?
  `;

  const result = await db.query<{
    id: number;
    title: string;
    slug: string;
    employment_type: string;
    work_location_type: string;
    city: string | null;
    state: string | null;
    compensation_min: number | null;
    compensation_max: number | null;
    is_featured: number;
    business_id: number;
    listing_name: string;
    listing_logo_url: string | null;
    created_at: Date;
  }>(query, [limit]);

  const jobs: FeaturedJob[] = result.rows.map(row => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    employment_type: row.employment_type,
    work_location_type: row.work_location_type,
    city: row.city,
    state: row.state,
    compensation_min: row.compensation_min,
    compensation_max: row.compensation_max,
    is_featured: Boolean(row.is_featured),
    business_id: row.business_id,
    listing_name: row.listing_name,
    listing_logo_url: row.listing_logo_url,
    created_at: new Date(row.created_at)
  }));

  // Get total active jobs count for "View All" link
  const countResult = await db.query<{ total: bigint }>(
    'SELECT COUNT(*) as total FROM job_postings WHERE status = ?',
    ['active']
  );
  const totalJobs = bigIntToNumber(countResult.rows[0]?.total || 0n);

  return createSuccessResponse({
    jobs,
    total_jobs: totalJobs,
    has_more: totalJobs > limit
  }, context.requestId);
});
