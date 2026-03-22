/**
 * Public Top Recommenders API Route
 * GET /api/public/top-recommenders - Get users with best recommendation metrics
 *
 * Scoring Algorithm:
 * - Composite score based on: recommendations_sent, helpful_rate, recency
 * - Orders by: most recommendations, highest satisfaction, most recent activity
 *
 * @tier SIMPLE
 * @phase Homepage Top Recommenders Scroller
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';
import type { RowDataPacket } from '@core/types/mariadb-compat';

interface TopRecommender {
  user_id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  recommendations_sent: number;
  helpful_rate: number;
  thanks_received: number;
  last_recommendation_at: string | null;
}

/**
 * GET /api/public/top-recommenders
 * Get top recommenders sorted by composite metrics
 *
 * Query Parameters:
 * - limit: number (default 10, max 20)
 *
 * Scoring: recommendations_sent * 0.4 + helpful_rate * 100 * 0.4 + recency_bonus * 0.2
 *
 * @public No authentication required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();

  // Parse query parameters
  const url = new URL(context.request.url);
  const limitStr = url.searchParams.get('limit');
  const limit = limitStr ? Math.min(parseInt(limitStr, 10), 20) : 10;

  // Query for top recommenders based on composite metrics
  // Using user_referrals directly since user_recommendation_stats may not exist
  const query = `
    SELECT
      u.id AS user_id,
      u.username,
      u.display_name,
      u.avatar_url,
      COUNT(ur.id) AS recommendations_sent,
      COALESCE(
        SUM(CASE WHEN ur.is_helpful = TRUE THEN 1 ELSE 0 END) * 100.0 /
        NULLIF(SUM(CASE WHEN ur.is_helpful IS NOT NULL THEN 1 ELSE 0 END), 0),
        0
      ) AS helpful_rate,
      SUM(CASE WHEN ur.thanked_at IS NOT NULL THEN 1 ELSE 0 END) AS thanks_received,
      MAX(ur.created_at) AS last_recommendation_at,
      -- Composite score: recommendations * 0.4 + helpful_rate * 0.4 + recency * 0.2
      (
        COUNT(ur.id) * 0.4 +
        COALESCE(
          SUM(CASE WHEN ur.is_helpful = TRUE THEN 1 ELSE 0 END) * 100.0 /
          NULLIF(SUM(CASE WHEN ur.is_helpful IS NOT NULL THEN 1 ELSE 0 END), 0),
          0
        ) * 0.4 +
        -- Recency score: 100 if within last 7 days, decays to 0 over 90 days
        GREATEST(0, 100 - DATEDIFF(NOW(), MAX(ur.created_at))) * 0.2
      ) AS composite_score
    FROM users u
    INNER JOIN user_referrals ur ON u.id = ur.referrer_user_id
    WHERE ur.entity_type != 'platform_invite'
      AND u.is_active = 1
    GROUP BY u.id, u.username, u.display_name, u.avatar_url
    HAVING COUNT(ur.id) >= 1
    ORDER BY composite_score DESC, recommendations_sent DESC, last_recommendation_at DESC
    LIMIT ?
  `;

  const result = await db.query<RowDataPacket>(query, [limit]);
  const rows = result.rows || [];

  const recommenders: TopRecommender[] = rows.map((row) => ({
    user_id: bigIntToNumber(row.user_id),
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    recommendations_sent: bigIntToNumber(row.recommendations_sent),
    helpful_rate: Math.round(Number(row.helpful_rate) || 0),
    thanks_received: bigIntToNumber(row.thanks_received),
    last_recommendation_at: row.last_recommendation_at
      ? new Date(row.last_recommendation_at).toISOString()
      : null
  }));

  return createSuccessResponse({
    recommenders,
    total: recommenders.length
  }, context.requestId);
}, {
  requireAuth: false  // Public endpoint - no authentication required
});
