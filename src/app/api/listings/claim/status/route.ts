/**
 * Claim Status API Route
 * GET /api/listings/claim/status?listing_id=123 - Check claim status
 *
 * @authority CLAUDE.md - API Standards section
 * @phase Claim Listing Phase 3
 * @tier ADVANCED
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getClaimListingService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/listings/claim/status?listing_id=123
 * Get the current user's claim status for a listing
 *
 * Query: listing_id (required)
 * Response: { success: true, data: { claim: ListingClaim | null } }
 *
 * NOTE: No withCsrf wrapper - GET requests are read-only and don't need CSRF
 */
export const GET = apiHandler(async (context: ApiContext) => {
  // 1. Extract authenticated user
  const userId = context.userId;
  if (!userId) {
    throw BizError.unauthorized('Authentication required');
  }
  const userIdNum = parseInt(userId);
  if (isNaN(userIdNum)) {
    throw BizError.badRequest('Invalid user ID');
  }

  // 2. Parse query parameter
  const url = new URL(context.request.url);
  const listingIdStr = url.searchParams.get('listing_id');

  if (!listingIdStr) {
    throw BizError.badRequest('listing_id query parameter is required');
  }

  const listingId = parseInt(listingIdStr);
  if (isNaN(listingId)) {
    throw BizError.badRequest('listing_id must be a valid number');
  }

  // 3. Get claim status
  const claimService = getClaimListingService();
  const claim = await claimService.getClaimStatus(listingId, userIdNum);

  return createSuccessResponse({ claim: claim || null }, context.requestId);

}, {
  requireAuth: true,
  allowedMethods: ['GET'],
});
