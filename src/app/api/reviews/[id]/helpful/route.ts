/**
 * Review Helpfulness API Route
 * POST /api/reviews/[id]/helpful - Mark review as helpful/not helpful
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 * - Duplicate vote prevention at service layer
 *
 * @authority CLAUDE.md - API Standards section
 * @authority Phase 4 Brain Plan - API Endpoint Layer Implementation
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getReviewService, getListingService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

/**
 * POST /api/reviews/[id]/helpful
 * Mark review as helpful or not helpful
 * Body:
 *   - user_id: User ID (required)
 *   - is_helpful: Whether review was helpful (true/false) (required)
 *
 * @authenticated User authentication required
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  // Extract review ID from URL pathname
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 2]; // Get ID from path (before 'helpful')
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
  if (!requestBody.user_id || typeof requestBody.user_id !== 'number') {
    throw BizError.validation('user_id', requestBody.user_id, 'User ID is required and must be a number');
  }

  if (requestBody.is_helpful === undefined || typeof requestBody.is_helpful !== 'boolean') {
    throw BizError.validation('is_helpful', requestBody.is_helpful, 'is_helpful is required and must be a boolean');
  }

  // Mark review helpfulness
  
  // ReviewService requires ListingService dependency
  
  
  const listingService = getListingService();
  const service = getReviewService();
  const result = await service.markHelpful(reviewId, requestBody.user_id, requestBody.is_helpful);

  return createSuccessResponse(result, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST']
}));
