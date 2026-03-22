/**
 * Review Owner Response API Route
 * POST /api/reviews/[id]/response - Add owner response to review
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 *
 * @authority CLAUDE.md - API Standards section
 * @authority Phase 4 Brain Plan - API Endpoint Layer Implementation
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getReviewService, getListingService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import { NotificationService } from '@core/services/NotificationService';
import { getDatabaseService } from '@core/services/DatabaseService';

/**
 * POST /api/reviews/[id]/response
 * Add owner response to review
 * Body:
 *   - response: Owner response text (required)
 *
 * @authenticated User authentication required (listing owner)
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  // Extract review ID from URL pathname
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 2]; // Get ID from path (before 'response')
  if (!id) {
    throw BizError.badRequest('Review ID is required');
  }
  const reviewId = parseInt(id);
  if (isNaN(reviewId)) {
    throw BizError.badRequest('Invalid review ID', { id });
  }

  // Parse request body
  let body: unknown;
  try {
    body = await context.request.json();
  } catch (error) {
    throw BizError.badRequest('Invalid JSON in request body');
  }

  // Validate body is an object
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw BizError.badRequest('Request body must be an object');
  }

  const requestBody = body as Record<string, unknown>;

  // Validate required fields
  if (!requestBody.response || typeof requestBody.response !== 'string' || requestBody.response.trim() === '') {
    throw BizError.validation('response', requestBody.response, 'Response is required and must be a non-empty string');
  }

  // Get authenticated user ID (listing owner)
  const userId = context.userId;
  if (!userId) {
    throw BizError.unauthorized('Authentication required');
  }
  const listingOwnerId = parseInt(userId);
  if (isNaN(listingOwnerId)) {
    throw BizError.badRequest('Invalid user ID');
  }

  // Add owner response (requires listingOwnerId parameter)
  
  // ReviewService requires ListingService dependency
  
  
  const listingService = getListingService();
  void listingService; // Used for DI validation; actual auth handled by addOwnerResponse
  const service = getReviewService();
  const review = await service.addOwnerResponse(reviewId, listingOwnerId, requestBody.response.trim());

  // Fire-and-forget: notify reviewer that owner has responded
  const db = getDatabaseService();
  db.query<{ user_id: number; listing_id: number }>(
    'SELECT user_id, listing_id FROM reviews WHERE id = ? LIMIT 1',
    [reviewId]
  ).then(reviewResult => {
    const reviewData = reviewResult.rows[0];
    if (reviewData) {
      const notificationService = new NotificationService(db);
      notificationService.dispatch({
        type: 'review.response',
        recipientId: reviewData.user_id,
        title: 'Business responded to your review',
        message: 'The business owner has responded to your review',
        entityType: 'review',
        entityId: reviewId,
        actionUrl: `/listings/${reviewData.listing_id}`,
        priority: 'normal',
        triggeredBy: listingOwnerId,
      }).catch(() => {});
    }
  }).catch(() => {});

  return createSuccessResponse({ review }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST']
}));
