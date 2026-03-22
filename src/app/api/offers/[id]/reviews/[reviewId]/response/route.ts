/**
 * Offer Review Owner Response API Route
 * POST /api/offers/[id]/reviews/[reviewId]/response - Add owner response to offer review
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - withCsrf: MANDATORY for state-changing POST
 * - requireAuth: MANDATORY — offer owner must be authenticated
 * - Validates: authenticated user owns the offer (via offers.listing_id -> listings.user_id)
 *
 * @authority CLAUDE.md - API Standards section
 * @phase Phase 4B - Owner Response for Offer Reviews
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import { getDatabaseService } from '@core/services/DatabaseService';
import { NotificationService } from '@core/services/NotificationService';

/**
 * POST /api/offers/[id]/reviews/[reviewId]/response
 * Add owner response to an offer review.
 * Body: { response: string }
 *
 * @authenticated Offer owner authentication required
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  // Extract offerId and reviewId from URL path
  // Path: /api/offers/[id]/reviews/[reviewId]/response
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  // segments: ['', 'api', 'offers', id, 'reviews', reviewId, 'response']
  const reviewId = parseInt(segments[segments.length - 2] ?? '');
  const offerId = parseInt(segments[segments.length - 4] ?? '');

  if (isNaN(offerId)) {
    throw BizError.badRequest('Invalid offer ID');
  }
  if (isNaN(reviewId)) {
    throw BizError.badRequest('Invalid review ID');
  }

  // Get authenticated user ID (offer owner)
  const userId = context.userId;
  if (!userId) {
    throw BizError.unauthorized('Authentication required');
  }
  const ownerId = parseInt(userId);
  if (isNaN(ownerId)) {
    throw BizError.badRequest('Invalid user ID');
  }

  // Parse request body
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    throw BizError.badRequest('Invalid JSON in request body');
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw BizError.badRequest('Request body must be an object');
  }

  const requestBody = body as Record<string, unknown>;

  if (!requestBody.response || typeof requestBody.response !== 'string' || requestBody.response.trim() === '') {
    throw BizError.validation('response', requestBody.response, 'Response is required and must be a non-empty string');
  }

  const responseText = requestBody.response.trim();

  const db = getDatabaseService();

  // Validate the offer exists and belongs to this user (via listing ownership)
  const offerCheck = await db.query<{ id: number; user_id: number }>(
    `SELECT o.id, l.user_id
     FROM offers o
     JOIN listings l ON l.id = o.listing_id
     WHERE o.id = ? LIMIT 1`,
    [offerId]
  );

  if (offerCheck.rows.length === 0) {
    throw BizError.notFound('Offer not found');
  }

  if (offerCheck.rows[0]!.user_id !== ownerId) {
    throw BizError.forbidden('You do not own this offer');
  }

  // Validate the review exists and belongs to this offer
  const reviewCheck = await db.query<{ id: number; user_id: number }>(
    'SELECT id, user_id FROM offer_reviews WHERE id = ? AND offer_id = ? LIMIT 1',
    [reviewId, offerId]
  );

  if (reviewCheck.rows.length === 0) {
    throw BizError.notFound('Review not found for this offer');
  }

  const reviewerId = reviewCheck.rows[0]!.user_id;

  // Update the owner response
  await db.query(
    'UPDATE offer_reviews SET owner_response = ?, owner_response_date = NOW() WHERE id = ?',
    [responseText, reviewId]
  );

  // Fire-and-forget: notify reviewer that owner has responded
  db.query<{ user_id: number }>(
    'SELECT user_id FROM offer_reviews WHERE id = ? LIMIT 1',
    [reviewId]
  ).then(() => {
    const notificationService = new NotificationService(db);
    notificationService.dispatch({
      type: 'review.response',
      recipientId: reviewerId,
      title: 'Business responded to your offer review',
      message: 'The business owner has responded to your offer review',
      entityType: 'review',
      entityId: reviewId,
      actionUrl: `/offers`,
      priority: 'normal',
      triggeredBy: ownerId,
    }).catch(() => {});
  }).catch(() => {});

  return createSuccessResponse(
    { reviewId, offerId, message: 'Response submitted' },
    context.requestId
  );
}, {
  requireAuth: true,
  allowedMethods: ['POST']
}));
