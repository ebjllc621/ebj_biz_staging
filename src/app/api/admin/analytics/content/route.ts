/**
 * GET /api/admin/analytics/content
 * Platform-wide content analytics for admin dashboard
 *
 * @tier STANDARD
 * @auth Admin only
 * @response { summary, byType, viewsTrend, topPerformers, engagementBreakdown }
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse
 * - Database: getDatabaseService boundary
 * - bigIntToNumber: ALL COUNT/SUM queries
 *
 * @reference src/app/api/admin/analytics/listings/route.ts — canonical admin analytics pattern
 * @phase Content Phase 4B - Admin Content Analytics
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier1_Phases/PHASE_4B_ADMIN_CONTENT_ANALYTICS.md
 */

import { getDatabaseService } from '@core/services/DatabaseService';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';

interface CountRow { count: bigint | number }
interface ViewsTrendRow {
  date: string;
  articles: bigint | number;
  podcasts: bigint | number;
  videos: bigint | number;
}
interface EngagementBreakdownRow {
  event_name: string;
  count: bigint | number;
}
interface TopPerformerRow {
  type: string;
  id: number;
  title: string;
  slug: string;
  views: bigint | number;
  comments: bigint | number;
  recommendations: bigint | number;
}

export const GET = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) throw BizError.unauthorized('Authentication required');
  if (user.role !== 'admin') throw BizError.forbidden('access content analytics', 'admin');

  const db = getDatabaseService();

  // Parallel queries for all dashboard data
  const [
    articlesCountResult,
    podcastsCountResult,
    videosCountResult,
    totalPageViewsResult,
    viewsTrendResult,
    totalEngagementsResult,
    engagementBreakdownResult,
    totalCommentsResult,
    totalRecommendationsResult,
    topPerformersResult,
  ] = await Promise.all([
    // Total articles
    db.query<CountRow>('SELECT COUNT(*) as count FROM content_articles'),

    // Total podcasts
    db.query<CountRow>('SELECT COUNT(*) as count FROM content_podcasts'),

    // Total videos
    db.query<CountRow>('SELECT COUNT(*) as count FROM content_videos'),

    // Total page views for content URLs
    db.query<CountRow>(
      `SELECT COUNT(*) as count FROM analytics_page_views
       WHERE url LIKE '/articles/%' OR url LIKE '/podcasts/%' OR url LIKE '/videos/%'`
    ),

    // Views by content type over last 30 days grouped by date
    db.query<ViewsTrendRow>(
      `SELECT DATE(created_at) as date,
              SUM(CASE WHEN url LIKE '/articles/%' THEN 1 ELSE 0 END) as articles,
              SUM(CASE WHEN url LIKE '/podcasts/%' THEN 1 ELSE 0 END) as podcasts,
              SUM(CASE WHEN url LIKE '/videos/%' THEN 1 ELSE 0 END) as videos
       FROM analytics_page_views
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         AND (url LIKE '/articles/%' OR url LIKE '/podcasts/%' OR url LIKE '/videos/%')
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    ),

    // Total content engagement events
    db.query<CountRow>(
      `SELECT COUNT(*) as count FROM analytics_events WHERE event_name LIKE 'content_%'`
    ),

    // Engagement breakdown by event type
    db.query<EngagementBreakdownRow>(
      `SELECT event_name, COUNT(*) as count FROM analytics_events
       WHERE event_name LIKE 'content_%'
       GROUP BY event_name
       ORDER BY count DESC`
    ),

    // Total active comments on content
    db.query<CountRow>(
      `SELECT COUNT(*) as count FROM content_comments WHERE status = 'active'`
    ),

    // Total recommendations for content entities
    db.query<CountRow>(
      `SELECT COUNT(*) as count FROM user_referrals
       WHERE entity_type IN ('article', 'podcast', 'video')`
    ),

    // Top 10 performing content by page views (UNION ALL across all 3 types)
    db.query<TopPerformerRow>(
      `SELECT 'article' as type, ca.id, ca.title, ca.slug,
              (SELECT COUNT(*) FROM analytics_page_views WHERE url LIKE CONCAT('/articles/', ca.slug, '%')) as views,
              (SELECT COUNT(*) FROM content_comments WHERE content_type = 'article' AND content_id = ca.id AND status = 'active') as comments,
              (SELECT COUNT(*) FROM user_referrals WHERE entity_type = 'article' AND entity_id = CAST(ca.id AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci) as recommendations
       FROM content_articles ca WHERE ca.status = 'published'
       UNION ALL
       SELECT 'podcast' as type, cp.id, cp.title, cp.slug,
              (SELECT COUNT(*) FROM analytics_page_views WHERE url LIKE CONCAT('/podcasts/', cp.slug, '%')) as views,
              (SELECT COUNT(*) FROM content_comments WHERE content_type = 'podcast' AND content_id = cp.id AND status = 'active') as comments,
              (SELECT COUNT(*) FROM user_referrals WHERE entity_type = 'podcast' AND entity_id = CAST(cp.id AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci) as recommendations
       FROM content_podcasts cp WHERE cp.status = 'published'
       UNION ALL
       SELECT 'video' as type, cv.id, cv.title, cv.slug,
              (SELECT COUNT(*) FROM analytics_page_views WHERE url LIKE CONCAT('/videos/', cv.slug, '%')) as views,
              (SELECT COUNT(*) FROM content_comments WHERE content_type = 'video' AND content_id = cv.id AND status = 'active') as comments,
              (SELECT COUNT(*) FROM user_referrals WHERE entity_type = 'video' AND entity_id = CAST(cv.id AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci) as recommendations
       FROM content_videos cv WHERE cv.status = 'published'
       ORDER BY views DESC
       LIMIT 10`
    ),
  ]);

  const totalArticles = bigIntToNumber(articlesCountResult.rows[0]?.count ?? 0);
  const totalPodcasts = bigIntToNumber(podcastsCountResult.rows[0]?.count ?? 0);
  const totalVideos = bigIntToNumber(videosCountResult.rows[0]?.count ?? 0);

  return createSuccessResponse({
    summary: {
      totalContent: totalArticles + totalPodcasts + totalVideos,
      totalArticles,
      totalPodcasts,
      totalVideos,
      totalPageViews: bigIntToNumber(totalPageViewsResult.rows[0]?.count ?? 0),
      totalEngagements: bigIntToNumber(totalEngagementsResult.rows[0]?.count ?? 0),
      totalComments: bigIntToNumber(totalCommentsResult.rows[0]?.count ?? 0),
      totalRecommendations: bigIntToNumber(totalRecommendationsResult.rows[0]?.count ?? 0),
    },
    byType: [
      { type: 'Articles', count: totalArticles },
      { type: 'Podcasts', count: totalPodcasts },
      { type: 'Videos', count: totalVideos },
    ],
    viewsTrend: viewsTrendResult.rows.map(r => ({
      date: r.date,
      articles: bigIntToNumber(r.articles),
      podcasts: bigIntToNumber(r.podcasts),
      videos: bigIntToNumber(r.videos),
    })),
    topPerformers: topPerformersResult.rows.map(r => ({
      id: r.id,
      title: r.title,
      type: r.type,
      slug: r.slug,
      views: bigIntToNumber(r.views),
      comments: bigIntToNumber(r.comments),
      recommendations: bigIntToNumber(r.recommendations),
    })),
    engagementBreakdown: engagementBreakdownResult.rows.map(r => ({
      event: r.event_name,
      count: bigIntToNumber(r.count),
    })),
  }, 200);
});
