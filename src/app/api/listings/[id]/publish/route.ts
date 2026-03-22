/**
 * Listing Publish API Route - POST publish a draft listing
 *
 * Validates required fields (name, slug, type, description, category) before
 * transitioning a draft listing to active status with pending approval.
 *
 * @tier STANDARD
 * @phase Phase 4A - Listing Lifecycle (Pause/Resume, Draft, Duplicate, Publish)
 * @governance Build Map v2.1 ENHANCED
 */

import { getListingService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { ListingNotFoundError, UnauthorizedAccessError, InvalidListingStatusError } from '@core/services/ListingService';

// ============================================================================
// POST - Publish a draft listing (owner only, validates completeness)
// ============================================================================

export const POST = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      401
    );
  }

  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const listingIdStr = pathSegments[pathSegments.length - 2] || '';
  const listingId = parseInt(listingIdStr, 10);

  if (isNaN(listingId)) {
    return createErrorResponse(
      BizError.badRequest('Invalid listing ID'),
      400
    );
  }

  const listingService = getListingService();

  try {
    const result = await listingService.publishDraftListing(listingId, user.id);
    return createSuccessResponse({
      listing: { id: result.listing.id, slug: result.listing.slug, status: result.listing.status },
      warnings: result.warnings
    }, 200);
  } catch (error) {
    if (error instanceof ListingNotFoundError) {
      return createErrorResponse(error, 404);
    }
    if (error instanceof UnauthorizedAccessError) {
      return createErrorResponse(error, 403);
    }
    if (error instanceof InvalidListingStatusError) {
      return createErrorResponse(error, 409);
    }
    if (error instanceof BizError && error.code === 'DRAFT_INCOMPLETE') {
      return createErrorResponse(error, 422);
    }
    throw error;
  }
});
