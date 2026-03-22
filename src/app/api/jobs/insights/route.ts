/**
 * Public Job Market Insights API Route
 *
 * GET /api/jobs/insights - Get published market content for the public insights hub
 *
 * @authority docs/pages/layouts/integrationPointRef/jobs/phases/PHASE_6_PLAN.md
 * @phase Jobs Phase 6A - Market Insights Completion
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber, safeJsonParse } from '@core/utils/bigint';

/**
 * GET /api/jobs/insights
 * Serves published market content to JobMarketInsightsGrid.
 * No auth required — public route.
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const url = new URL(context.request.url);

  const contentType = url.searchParams.get('content_type');
  const region = url.searchParams.get('region');
  const sortBy = url.searchParams.get('sort_by') || 'newest';
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);
  const offset = (page - 1) * limit;

  const conditions: string[] = ["status = 'published'"];
  const params: unknown[] = [];

  if (contentType) {
    conditions.push('content_type = ?');
    params.push(contentType);
  }

  if (region) {
    conditions.push('JSON_SEARCH(regions, "one", ?) IS NOT NULL');
    params.push(region);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Determine sort order
  const orderClause =
    sortBy === 'popular'
      ? 'ORDER BY view_count DESC, published_date DESC'
      : 'ORDER BY is_featured DESC, published_date DESC, created_at DESC';

  const query = `
    SELECT *
    FROM job_market_content
    ${whereClause}
    ${orderClause}
    LIMIT ? OFFSET ?
  `;

  const queryParams = [...params, limit, offset];
  const result = await db.query<{
    id: number;
    content_type: string;
    title: string;
    slug: string;
    summary: string | null;
    content: string;
    data_json: string | null;
    cover_image_url: string | null;
    regions: string | null;
    job_categories: string | null;
    published_date: Date | null;
    status: string;
    author_user_id: number | null;
    view_count: number;
    is_featured: number;
    created_at: Date;
    updated_at: Date;
  }>(query, queryParams);

  const contents = result.rows.map(row => ({
    id: row.id,
    content_type: row.content_type,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    content: row.content,
    data_json: safeJsonParse(row.data_json, null),
    cover_image_url: row.cover_image_url,
    regions: row.regions ? safeJsonParse<string[]>(row.regions, []) : null,
    job_categories: row.job_categories ? safeJsonParse<number[]>(row.job_categories, []) : null,
    published_date: row.published_date ? new Date(row.published_date) : null,
    status: row.status,
    author_user_id: row.author_user_id,
    view_count: row.view_count,
    is_featured: Boolean(row.is_featured),
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at)
  }));

  // Get total count for pagination
  const countQuery = `SELECT COUNT(*) as total FROM job_market_content ${whereClause}`;
  const countResult = await db.query<{ total: bigint }>(countQuery, params);
  const total = bigIntToNumber(countResult.rows[0]?.total || 0n);

  return createSuccessResponse({
    contents,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit)
    }
  }, context.requestId);
});
