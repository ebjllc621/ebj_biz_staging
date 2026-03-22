/**
 * GET /api/events/reviews
 * Aggregate event reviews for all events owned by a listing
 *
 * Query Parameters:
 *   - listingId: Required. ID of the listing to fetch event reviews for.
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 10, max: 50)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - bigIntToNumber on all COUNT queries
 * - createSuccessResponse with context.requestId
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 3 - Dashboard Enhancement (PHASE_3_BRAIN_PLAN.md)
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';
import { BizError } from '@core/errors/BizError';

interface EventReviewRow {
  id: number;
  event_id: number;
  event_title: string;
  user_id: number;
  rating: number;
  title: null;
  review_text: string | null;
  status: string | null;
  owner_response: null;
  owner_response_date: null;
  is_testimonial_approved: boolean | null;
  created_at: string;
  updated_at: string;
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

  const result = await db.query<EventReviewRow>(`
    SELECT
      er.id,
      er.event_id,
      e.title AS event_title,
      er.user_id,
      er.rating,
      NULL AS title,
      er.review_text,
      er.status,
      NULL AS owner_response,
      NULL AS owner_response_date,
      er.is_testimonial_approved,
      er.created_at,
      er.updated_at
    FROM event_reviews er
    JOIN events e ON er.event_id = e.id
    WHERE e.listing_id = ?
    ORDER BY er.created_at DESC
    LIMIT ? OFFSET ?
  `, [listingId, limit, offset]);

  const countResult = await db.query<CountRow>(`
    SELECT COUNT(*) AS total
    FROM event_reviews er
    JOIN events e ON er.event_id = e.id
    WHERE e.listing_id = ?
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
