/**
 * Listing Pause API Route - POST pause an active listing
 *
 * @tier STANDARD
 * @phase Phase 4A - Listing Lifecycle (Pause/Resume, Draft, Duplicate)
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/listings/features/phases/PHASE_4A_BRAIN_PLAN.md
 */

import { getListingService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { ListingNotFoundError, UnauthorizedAccessError, InvalidListingStatusError } from '@core/services/ListingService';

// ============================================================================
// POST - Pause a listing (owner only)
// ============================================================================

export const POST = apiHandler(async (context) => {
  const { request } = context;

  // Auth required
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      401
    );
  }

  // Extract listing ID from URL pathname
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  // pathSegments: ['', 'api', 'listings', '[id]', 'pause']
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
    const listing = await listingService.pauseListing(listingId, user.id);
    return createSuccessResponse({ listing }, 200);
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
    throw error;
  }
});
