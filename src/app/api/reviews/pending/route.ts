/**
 * Pending Reviews API Route
 * GET /api/reviews/pending - Get pending reviews (admin only)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 * - Admin authorization required
 *
 * @authority CLAUDE.md - API Standards section
 * @authority Phase 4 Brain Plan - API Endpoint Layer Implementation
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getReviewService, getListingService } from '@core/services/ServiceRegistry';

/**
 * GET /api/reviews/pending
 * Get all pending reviews awaiting moderation
 * Query parameters: None (getPendingReviews() takes no parameters)
 *
 * @admin Admin authentication required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  // Get pending reviews (no parameters - returns all pending reviews)
  
  // ReviewService requires ListingService dependency
  
  
  const listingService = getListingService();
  const service = getReviewService();
  const reviews = await service.getPendingReviews();

  return createSuccessResponse({ reviews }, context.requestId);
}, {
  requireAuth: true, // TODO: Change to requireAdmin when RBAC is implemented
  allowedMethods: ['GET']
});
