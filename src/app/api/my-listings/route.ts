/**
 * My Listings API Route - Get user's listings
 *
 * GET /api/my-listings - Get all listings owned by current user
 *
 * @authority PHASE_5.4.1_BRAIN_PLAN.md
 * @governance Build Map v2.1 ENHANCED compliance
 * @pattern Phase 5.4 API route pattern
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getListingService } from '@core/services/ServiceRegistry';
import { getUserFromRequest, isListingMember } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/my-listings - Get user's listings
 *
 * @governance Authentication required (listing_member or admin)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // GOVERNANCE: Extract user session
  const user = await getUserFromRequest(request);

  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Unauthorized'),
      context.requestId
    );
  }

  // GOVERNANCE: Account type check
  if (!isListingMember(user)) {
    return createErrorResponse(
      BizError.forbidden('view listings'),
      context.requestId
    );
  }

  // Initialize services
  
  
  
  const listingService = getListingService();

  try {
    // Get all user's listings
    const result = await listingService.getAll({ userId: user.id });

    return createSuccessResponse(
      {
        listings: result.data || [],
        count: (result.data || []).length
      },
      context.requestId
    );
  } catch (error) {
    return createErrorResponse(
      error instanceof BizError ? error : BizError.internalServerError('ListingAPI'),
      context.requestId
    );
  }
});
