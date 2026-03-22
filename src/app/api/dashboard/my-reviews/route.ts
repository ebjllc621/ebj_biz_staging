/**
 * GET /api/dashboard/my-reviews
 * Returns all reviews written by the authenticated user across all entity types.
 * UNION ALL across: reviews, event_reviews, offer_reviews, creator profile review tables.
 *
 * Query Parameters:
 *   - entityType: Optional filter ('listing' | 'event' | 'offer' | 'creator')
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 10, max: 50)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper with requireAuth: MANDATORY
 * - bigIntToNumber on all COUNT queries
 * - createSuccessResponse with context.requestId
 * - context.userId (string) parsed to int for DB queries
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 3 - Dashboard Enhancement (PHASE_3_BRAIN_PLAN.md)
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';
import { BizError } from '@core/errors/BizError';

interface ReviewWithEntityRow {
  id: number;
  entity_type: string;
  entity_id: number;
  entity_name: string | null;
  rating: number;
  title: string | null;
  review_text: string | null;
  status: string;
  owner_response: string | null;
  owner_response_date: string | null;
  created_at: string;
}

interface CountRow {
  total: number | bigint;
}

export const GET = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const userId = parseInt(context.userId, 10);
  const url = new URL(context.request.url);

  const entityTypeParam = url.searchParams.get('entityType');
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10), 50);
  const offset = (page - 1) * limit;

  const db = getDatabaseService();

  // Build the full UNION ALL query wrapped in a subquery for optional entityType filtering
  const unionQuery = `
    SELECT
      r.id,
      'listing' AS entity_type,
      r.listing_id AS entity_id,
      l.name AS entity_name,
      r.rating,
      r.title,
      r.review_text,
      r.status,
      r.owner_response,
      r.owner_response_date,
      r.created_at
    FROM reviews r
    LEFT JOIN listings l ON r.listing_id = l.id
    WHERE r.user_id = ?

    UNION ALL

    SELECT
      er.id,
      'event' AS entity_type,
      er.event_id AS entity_id,
      e.title AS entity_name,
      er.rating,
      NULL AS title,
      er.review_text,
      er.status,
      NULL AS owner_response,
      NULL AS owner_response_date,
      er.created_at
    FROM event_reviews er
    LEFT JOIN events e ON er.event_id = e.id
    WHERE er.user_id = ?

    UNION ALL

    SELECT
      orv.id,
      'offer' AS entity_type,
      orv.offer_id AS entity_id,
      o.title AS entity_name,
      orv.rating,
      NULL AS title,
      orv.comment AS review_text,
      'approved' AS status,
      NULL AS owner_response,
      NULL AS owner_response_date,
      orv.created_at
    FROM offer_reviews orv
    LEFT JOIN offers o ON orv.offer_id = o.id
    WHERE orv.user_id = ?

    UNION ALL

    SELECT
      amr.id,
      'creator' AS entity_type,
      amr.marketer_id AS entity_id,
      cam.display_name COLLATE utf8mb4_unicode_ci AS entity_name,
      amr.rating,
      NULL AS title,
      amr.review_text COLLATE utf8mb4_unicode_ci AS review_text,
      amr.status COLLATE utf8mb4_unicode_ci AS status,
      NULL AS owner_response,
      NULL AS owner_response_date,
      amr.created_at
    FROM affiliate_marketer_reviews amr
    LEFT JOIN content_affiliate_marketers cam ON amr.marketer_id = cam.id
    WHERE amr.reviewer_user_id = ?

    UNION ALL

    SELECT
      ipr.id,
      'creator' AS entity_type,
      ipr.personality_id AS entity_id,
      cip.display_name COLLATE utf8mb4_unicode_ci AS entity_name,
      ipr.rating,
      NULL AS title,
      ipr.review_text COLLATE utf8mb4_unicode_ci AS review_text,
      ipr.status COLLATE utf8mb4_unicode_ci AS status,
      NULL AS owner_response,
      NULL AS owner_response_date,
      ipr.created_at
    FROM internet_personality_reviews ipr
    LEFT JOIN content_internet_personalities cip ON ipr.personality_id = cip.id
    WHERE ipr.reviewer_user_id = ?

    UNION ALL

    SELECT
      pr.id,
      'creator' AS entity_type,
      pr.podcaster_id AS entity_id,
      cp.display_name COLLATE utf8mb4_unicode_ci AS entity_name,
      pr.rating,
      NULL AS title,
      pr.review_text COLLATE utf8mb4_unicode_ci AS review_text,
      pr.status COLLATE utf8mb4_unicode_ci AS status,
      NULL AS owner_response,
      NULL AS owner_response_date,
      pr.created_at
    FROM podcaster_reviews pr
    LEFT JOIN content_podcasters cp ON pr.podcaster_id = cp.id
    WHERE pr.reviewer_user_id = ?

    UNION ALL

    SELECT
      cr.id,
      CONCAT('content_', cr.content_type) AS entity_type,
      cr.content_id AS entity_id,
      cr.content_type AS entity_name,
      COALESCE(cr.rating, 0) AS rating,
      cr.title,
      cr.comment AS review_text,
      COALESCE(cr.status, 'approved') AS status,
      NULL AS owner_response,
      NULL AS owner_response_date,
      cr.created_at
    FROM content_ratings cr
    WHERE cr.user_id = ? AND (cr.comment IS NOT NULL AND cr.comment != '')
  `;

  // Base params: one userId per subquery (7 total)
  const baseParams: (number | string)[] = [userId, userId, userId, userId, userId, userId, userId];

  // Wrap in outer query to apply optional entityType filter
  // 'content' filter matches all content_* types (content_article, content_video, etc.)
  const entityTypeFilter = entityTypeParam
    ? entityTypeParam === 'content'
      ? "WHERE entity_type LIKE 'content_%'"
      : 'WHERE entity_type = ?'
    : '';
  const entityTypeFilterParams: string[] = (entityTypeParam && entityTypeParam !== 'content') ? [entityTypeParam] : [];

  const dataResult = await db.query<ReviewWithEntityRow>(`
    SELECT * FROM (${unionQuery}) AS all_reviews
    ${entityTypeFilter}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [...baseParams, ...entityTypeFilterParams, limit, offset]);

  const countResult = await db.query<CountRow>(`
    SELECT COUNT(*) AS total FROM (${unionQuery}) AS all_reviews
    ${entityTypeFilter}
  `, [...baseParams, ...entityTypeFilterParams]);

  const total = bigIntToNumber(countResult.rows[0]?.total ?? 0);

  return createSuccessResponse({
    data: dataResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }, context.requestId);
}, {
  allowedMethods: ['GET'],
  requireAuth: true
});
