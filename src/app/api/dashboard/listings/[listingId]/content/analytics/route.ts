/**
 * Dashboard Listing Content Analytics API Route
 * GET /api/dashboard/listings/[listingId]/content/analytics
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - requireAuth: true
 * - bigIntToNumber: ALL COUNT/SUM results
 * - Listing ownership validation
 * - DatabaseService boundary
 *
 * @authority CLAUDE.md - API Standards section
 * @phase Content Phase 5B
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { bigIntToNumber } from '@core/utils/bigint';

// ============================================================================
// Helper: Extract and validate listingId from URL
// ============================================================================

function extractListingId(url: URL): number {
  const segments = url.pathname.split('/');
  // /api/dashboard/listings/[listingId]/content/analytics
  const analyticsIndex = segments.indexOf('analytics');
  if (analyticsIndex < 2) {
    throw BizError.badRequest('Invalid URL structure');
  }
  // listingId is 2 segments before 'analytics' (content is in between)
  const raw = segments[analyticsIndex - 2];
  const id = parseInt(raw ?? '');
  if (!raw || isNaN(id)) {
    throw BizError.badRequest('Invalid listing ID');
  }
  return id;
}

// ============================================================================
// Helper: Verify user owns the listing
// ============================================================================

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

// ============================================================================
// GET — Content analytics for a listing
// ============================================================================

export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const listingId = extractListingId(url);

  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  await verifyListingOwnership(listingId, user.id);

  // Date range from query params, defaulting to last 30 days
  const now = new Date();
  const defaultEnd = new Date(now);
  const defaultStart = new Date(now);
  defaultStart.setDate(defaultStart.getDate() - 30);

  const startParam = url.searchParams.get('start');
  const endParam = url.searchParams.get('end');

  const startDate = startParam ? new Date(startParam) : defaultStart;
  const endDate = endParam ? new Date(endParam) : defaultEnd;

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  const db = getDatabaseService();

  // 1. Total views by URL pattern
  let totalViews = 0;
  try {
    const viewsResult = await db.query<{ count: bigint | number }>(
      `SELECT COUNT(*) as count FROM analytics_page_views
       WHERE created_at >= ? AND created_at <= ?
       AND (
         url IN (SELECT CONCAT('/articles/', slug) FROM content_articles WHERE listing_id = ?)
         OR url IN (SELECT CONCAT('/podcasts/', slug) FROM content_podcasts WHERE listing_id = ?)
         OR url IN (SELECT CONCAT('/videos/', slug) FROM content_videos WHERE listing_id = ?)
       )`,
      [startDate, endDate, listingId, listingId, listingId]
    );
    totalViews = bigIntToNumber(viewsResult.rows[0]?.count ?? 0);
  } catch {
    totalViews = 0;
  }

  // 2. Total engagements
  let totalEngagements = 0;
  try {
    const engResult = await db.query<{ count: bigint | number }>(
      `SELECT COUNT(*) as count FROM analytics_events
       WHERE event_name LIKE 'content_%'
       AND created_at >= ? AND created_at <= ?
       AND (
         JSON_EXTRACT(event_data, '$.content_id') IN (SELECT id FROM content_articles WHERE listing_id = ?)
         OR JSON_EXTRACT(event_data, '$.content_id') IN (SELECT id FROM content_podcasts WHERE listing_id = ?)
         OR JSON_EXTRACT(event_data, '$.content_id') IN (SELECT id FROM content_videos WHERE listing_id = ?)
       )`,
      [startDate, endDate, listingId, listingId, listingId]
    );
    totalEngagements = bigIntToNumber(engResult.rows[0]?.count ?? 0);
  } catch {
    totalEngagements = 0;
  }

  // 3. Total comments
  let totalComments = 0;
  try {
    const commentsResult = await db.query<{ count: bigint | number }>(
      `SELECT COUNT(*) as count FROM content_comments
       WHERE status = 'active' AND created_at >= ? AND created_at <= ?
       AND (
         (content_type = 'article' AND content_id IN (SELECT id FROM content_articles WHERE listing_id = ?))
         OR (content_type = 'podcast' AND content_id IN (SELECT id FROM content_podcasts WHERE listing_id = ?))
         OR (content_type = 'video' AND content_id IN (SELECT id FROM content_videos WHERE listing_id = ?))
       )`,
      [startDate, endDate, listingId, listingId, listingId]
    );
    totalComments = bigIntToNumber(commentsResult.rows[0]?.count ?? 0);
  } catch {
    totalComments = 0;
  }

  // 4. Total recommendations — return 0 (no content entity_types in user_referrals yet)
  const totalRecommendations = 0;

  // 5. Views trend (daily)
  let viewsTrend: Array<{ date: string; views: number }> = [];
  try {
    const trendResult = await db.query<{ date: string; views: bigint | number }>(
      `SELECT DATE(apv.created_at) as date, COUNT(*) as views
       FROM analytics_page_views apv
       WHERE apv.created_at >= ? AND apv.created_at <= ?
       AND (
         apv.url IN (SELECT CONCAT('/articles/', slug) FROM content_articles WHERE listing_id = ?)
         OR apv.url IN (SELECT CONCAT('/podcasts/', slug) FROM content_podcasts WHERE listing_id = ?)
         OR apv.url IN (SELECT CONCAT('/videos/', slug) FROM content_videos WHERE listing_id = ?)
       )
       GROUP BY DATE(apv.created_at)
       ORDER BY DATE(apv.created_at) ASC`,
      [startDate, endDate, listingId, listingId, listingId]
    );
    viewsTrend = trendResult.rows.map(row => ({
      date: row.date,
      views: bigIntToNumber(row.views),
    }));
  } catch {
    viewsTrend = [];
  }

  // 6. Engagement breakdown by event_name
  let engagementBreakdown: Array<{ type: string; count: number }> = [];
  try {
    const breakdownResult = await db.query<{ event_name: string; count: bigint | number }>(
      `SELECT event_name, COUNT(*) as count FROM analytics_events
       WHERE event_name LIKE 'content_%'
       AND created_at >= ? AND created_at <= ?
       AND (
         JSON_EXTRACT(event_data, '$.content_id') IN (SELECT id FROM content_articles WHERE listing_id = ?)
         OR JSON_EXTRACT(event_data, '$.content_id') IN (SELECT id FROM content_podcasts WHERE listing_id = ?)
         OR JSON_EXTRACT(event_data, '$.content_id') IN (SELECT id FROM content_videos WHERE listing_id = ?)
       )
       GROUP BY event_name
       ORDER BY count DESC`,
      [startDate, endDate, listingId, listingId, listingId]
    );
    engagementBreakdown = breakdownResult.rows.map(row => ({
      type: row.event_name,
      count: bigIntToNumber(row.count),
    }));
  } catch {
    engagementBreakdown = [];
  }

  // 7. Top content (top 10 by views)
  let topContent: Array<{ id: number; title: string; type: string; views: number }> = [];
  try {
    const allContentResult = await db.query<{
      type: string;
      id: number;
      title: string;
      url: string;
    }>(
      `SELECT 'article' as type, a.id, a.title, CONCAT('/articles/', a.slug) as url
       FROM content_articles a WHERE a.listing_id = ?
       UNION ALL
       SELECT 'podcast', p.id, p.title, CONCAT('/podcasts/', p.slug)
       FROM content_podcasts p WHERE p.listing_id = ?
       UNION ALL
       SELECT 'video', v.id, v.title, CONCAT('/videos/', v.slug)
       FROM content_videos v WHERE v.listing_id = ?`,
      [listingId, listingId, listingId]
    );

    if (allContentResult.rows.length > 0) {
      const contentWithViews = await Promise.all(
        allContentResult.rows.map(async (item) => {
          let views = 0;
          try {
            const vResult = await db.query<{ cnt: bigint | number }>(
              'SELECT COUNT(*) as cnt FROM analytics_page_views WHERE url = ? AND created_at >= ? AND created_at <= ?',
              [item.url, startDate, endDate]
            );
            views = bigIntToNumber(vResult.rows[0]?.cnt ?? 0);
          } catch {
            views = 0;
          }
          return { id: item.id, title: item.title, type: item.type, views };
        })
      );

      topContent = contentWithViews
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);
    }
  } catch {
    topContent = [];
  }

  // 8. Content type counts
  let contentTypeCounts = { articles: 0, podcasts: 0, videos: 0 };
  try {
    const [articlesResult, podcastsResult, videosResult] = await Promise.all([
      db.query<{ cnt: bigint | number }>(
        'SELECT COUNT(*) AS cnt FROM content_articles WHERE listing_id = ?',
        [listingId]
      ),
      db.query<{ cnt: bigint | number }>(
        'SELECT COUNT(*) AS cnt FROM content_podcasts WHERE listing_id = ?',
        [listingId]
      ),
      db.query<{ cnt: bigint | number }>(
        'SELECT COUNT(*) AS cnt FROM content_videos WHERE listing_id = ?',
        [listingId]
      ),
    ]);
    contentTypeCounts = {
      articles: bigIntToNumber(articlesResult.rows[0]?.cnt ?? 0),
      podcasts: bigIntToNumber(podcastsResult.rows[0]?.cnt ?? 0),
      videos: bigIntToNumber(videosResult.rows[0]?.cnt ?? 0),
    };
  } catch {
    contentTypeCounts = { articles: 0, podcasts: 0, videos: 0 };
  }

  // Calculate engagement rate
  const engagementRate = totalViews > 0 ? (totalEngagements / totalViews) * 100 : 0;

  return createSuccessResponse(
    {
      totalViews,
      totalEngagements,
      totalComments,
      totalRecommendations,
      engagementRate,
      viewsTrend,
      engagementBreakdown,
      topContent,
      contentTypeCounts,
    },
    context.requestId
  );
}, {
  requireAuth: true,
  allowedMethods: ['GET'],
});
