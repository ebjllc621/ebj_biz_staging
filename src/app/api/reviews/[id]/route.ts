/**
 * Review Detail API Routes
 * GET /api/reviews/[id] - Get review by ID
 * PATCH /api/reviews/[id] - Update review
 * DELETE /api/reviews/[id] - Delete review
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

/**
 * GET /api/reviews/[id]
 * Get review by ID
 *
 * @public No authentication required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  // Extract review ID from URL pathname
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 1]; // Get last segment (the ID)
  if (!id) {
    throw BizError.badRequest('Review ID is required');
  }
  const reviewId = parseInt(id);
  if (isNaN(reviewId)) {
    throw BizError.badRequest('Invalid review ID', { id });
  }

  
  // ReviewService requires ListingService dependency
  
  
  const listingService = getListingService();
  const service = getReviewService();
  const review = await service.getById(reviewId);

  return createSuccessResponse({ review }, context.requestId);
}, {
  allowedMethods: ['GET', 'PATCH', 'DELETE']
});

/**
 * PATCH /api/reviews/[id]
 * Update review
 * Body: Partial review update fields (rating, title, review_text, images)
 *
 * @authenticated User authentication required
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  // Extract review ID from URL pathname
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 1]; // Get last segment (the ID)
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

  // Validate images if provided
  if (requestBody.images !== undefined && !Array.isArray(requestBody.images)) {
    throw BizError.validation('images', requestBody.images, 'Images must be an array');
  }

  // Get authenticated user ID
  const userId = context.userId;
  if (!userId) {
    throw BizError.unauthorized('Authentication required');
  }
  const userIdNum = parseInt(userId);
  if (isNaN(userIdNum)) {
    throw BizError.badRequest('Invalid user ID');
  }

  // Update review (requires userId parameter)
  
  // ReviewService requires ListingService dependency
  
  
  const listingService = getListingService();
  const service = getReviewService();
  const review = await service.update(reviewId, userIdNum, body);

  return createSuccessResponse({ review }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET', 'PATCH', 'DELETE']
}));

/**
 * DELETE /api/reviews/[id]
 * Delete review
 *
 * @authenticated User authentication required
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  // Extract review ID from URL pathname
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 1]; // Get last segment (the ID)
  if (!id) {
    throw BizError.badRequest('Review ID is required');
  }
  const reviewId = parseInt(id);
  if (isNaN(reviewId)) {
    throw BizError.badRequest('Invalid review ID', { id });
  }

  // Get authenticated user ID
  const userId = context.userId;
  if (!userId) {
    throw BizError.unauthorized('Authentication required');
  }
  const userIdNum = parseInt(userId);
  if (isNaN(userIdNum)) {
    throw BizError.badRequest('Invalid user ID');
  }

  // Delete review (requires userId parameter)
  
  // ReviewService requires ListingService dependency
  
  
  const listingService = getListingService();
  const service = getReviewService();
  await service.delete(reviewId, userIdNum);

  return createSuccessResponse({ message: 'Review deleted successfully' }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET', 'PATCH', 'DELETE']
}));
