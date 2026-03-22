/**
 * GET /api/creator-profiles/reviews
 * Aggregate creator profile reviews for all profiles owned by a listing
 * UNION ALL across: affiliate_marketer_reviews, internet_personality_reviews, podcaster_reviews
 *
 * Query Parameters:
 *   - listingId: Required. ID of the listing to fetch creator reviews for.
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 10, max: 50)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - bigIntToNumber on all COUNT queries
 * - createSuccessResponse with context.requestId
 *
 * NOTE: Creator review tables use `reviewer_user_id` (not `user_id`).
 *       profile_type identifies which creator type the review belongs to.
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 3 - Dashboard Enhancement (PHASE_3_BRAIN_PLAN.md)
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';
import { BizError } from '@core/errors/BizError';

interface CreatorReviewRow {
  id: number;
  profile_type: string;
  profile_id: number;
  profile_name: string;
  rating: number;
  title: null;
  review_text: string | null;
  status: string | null;
  owner_response: null;
  owner_response_date: null;
  created_at: string;
}

interface CountRow {
  total: number | bigint;
}

export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;
  const url = new URL(request.url);

  const listingIdParam = url.searchParams.get('listingId');
  if (!listingIdParam) throw BizError.badRequest('listingId is required');
  const listingId = parseInt(listingIdParam, 10);
  if (isNaN(listingId)) throw BizError.badRequest('Invalid listingId');

  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10), 50);
  const offset = (page - 1) * limit;

  const db = getDatabaseService();

  const result = await db.query<CreatorReviewRow>(`
    SELECT
      amr.id,
      'affiliate_marketer' AS profile_type,
      amr.marketer_id AS profile_id,
      cam.display_name AS profile_name,
      amr.rating,
      NULL AS title,
      amr.review_text,
      amr.status,
      NULL AS owner_response,
      NULL AS owner_response_date,
      amr.created_at
    FROM affiliate_marketer_reviews amr
    JOIN content_affiliate_marketers cam ON amr.marketer_id = cam.id
    WHERE cam.listing_id = ?

    UNION ALL

    SELECT
      ipr.id,
      'internet_personality' AS profile_type,
      ipr.personality_id AS profile_id,
      cip.display_name AS profile_name,
      ipr.rating,
      NULL AS title,
      ipr.review_text,
      ipr.status,
      NULL AS owner_response,
      NULL AS owner_response_date,
      ipr.created_at
    FROM internet_personality_reviews ipr
    JOIN content_internet_personalities cip ON ipr.personality_id = cip.id
    WHERE cip.listing_id = ?

    UNION ALL

    SELECT
      pr.id,
      'podcaster' AS profile_type,
      pr.podcaster_id AS profile_id,
      cp.display_name AS profile_name,
      pr.rating,
      NULL AS title,
      pr.review_text,
      pr.status,
      NULL AS owner_response,
      NULL AS owner_response_date,
      pr.created_at
    FROM podcaster_reviews pr
    JOIN content_podcasters cp ON pr.podcaster_id = cp.id
    WHERE cp.listing_id = ?

    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [listingId, listingId, listingId, limit, offset]);

  const countResult = await db.query<CountRow>(`
    SELECT SUM(cnt) AS total FROM (
      SELECT COUNT(*) AS cnt
      FROM affiliate_marketer_reviews amr
      JOIN content_affiliate_marketers cam ON amr.marketer_id = cam.id
      WHERE cam.listing_id = ?

      UNION ALL

      SELECT COUNT(*) AS cnt
      FROM internet_personality_reviews ipr
      JOIN content_internet_personalities cip ON ipr.personality_id = cip.id
      WHERE cip.listing_id = ?

      UNION ALL

      SELECT COUNT(*) AS cnt
      FROM podcaster_reviews pr
      JOIN content_podcasters cp ON pr.podcaster_id = cp.id
      WHERE cp.listing_id = ?
    ) AS counts
  `, [listingId, listingId, listingId]);

  const total = bigIntToNumber(countResult.rows[0]?.total ?? 0);

  return createSuccessResponse({
    data: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }, context.requestId);
}, { allowedMethods: ['GET'] });
