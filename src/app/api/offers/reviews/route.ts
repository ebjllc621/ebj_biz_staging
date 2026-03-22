/**
 * GET /api/offers/reviews
 * Aggregate offer reviews for all offers owned by a listing
 *
 * Query Parameters:
 *   - listingId: Required. ID of the listing to fetch offer reviews for.
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 10, max: 50)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - bigIntToNumber on all COUNT queries
 * - createSuccessResponse with context.requestId
 *
 * NOTE: offer_reviews uses `comment` not `review_text`.
 *       Aliased to review_text for consistent consumer interface.
 *       No status column — hardcoded to 'approved'.
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 3 - Dashboard Enhancement (PHASE_3_BRAIN_PLAN.md)
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';
import { BizError } from '@core/errors/BizError';

interface OfferReviewRow {
  id: number;
  offer_id: number;
  offer_title: string;
  user_id: number;
  rating: number;
  title: null;
  review_text: string | null;
  images: string[] | string | null;
  status: string;
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

  const result = await db.query<OfferReviewRow>(`
    SELECT
      orv.id,
      orv.offer_id,
      o.title AS offer_title,
      orv.user_id,
      orv.rating,
      NULL AS title,
      orv.comment AS review_text,
      orv.images,
      'approved' AS status,
      NULL AS owner_response,
      NULL AS owner_response_date,
      orv.created_at
    FROM offer_reviews orv
    JOIN offers o ON orv.offer_id = o.id
    WHERE o.listing_id = ?
    ORDER BY orv.created_at DESC
    LIMIT ? OFFSET ?
  `, [listingId, limit, offset]);

  const countResult = await db.query<CountRow>(`
    SELECT COUNT(*) AS total
    FROM offer_reviews orv
    JOIN offers o ON orv.offer_id = o.id
    WHERE o.listing_id = ?
  `, [listingId]);

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
