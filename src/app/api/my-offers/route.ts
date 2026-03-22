/**
 * My Offers API Route - Get user's offers across all listings
 *
 * GET /api/my-offers - Get all offers for user's listings
 *
 * @authority PHASE_5.4.1_BRAIN_PLAN.md - Task 2.1
 * @governance Build Map v2.1 ENHANCED compliance
 * @pattern Phase 5.4 API route pattern with tier enforcement
 */

// PATTERN: Imports from @reference src/app/api/listings/route.ts (lines 13-18)
import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getOfferService, getListingService } from '@core/services/ServiceRegistry';
import { getUserFromRequest, isListingMember } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/my-offers - Get user's offers across all listings
 *
 * @governance Authentication required (listing_member or admin)
 * @governance Ownership verification (only user's listings)
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
      BizError.forbidden('manage offers'),
      context.requestId
    );
  }

  // PATTERN: Service initialization from @reference POST /api/listings (lines 102-114)
  
  
  
  const listingService = getListingService();
  const offerService = getOfferService();

  try {
    // Get all user's listings
    const userListings = await listingService.getAll({ userId: user.id });
    const listings = userListings.data || [];
    const listingIds = listings.map((l: { id: number }) => l.id);

    // Get all offers for user's listings
    const allOffers = [];
    for (const listingId of listingIds) {
      const listingOffers = await offerService.getAll({ listingId });
      allOffers.push(...(listingOffers.data || []));
    }

    // Enrich with listing names
    const enrichedOffers = allOffers.map((offer) => {
      const listing = listings.find((l: { id: number }) => l.id === offer.listing_id);
      return {
        ...offer,
        listing_name: listing?.name || 'Unknown Listing'
      };
    });

    return createSuccessResponse(
      {
        offers: enrichedOffers,
        count: enrichedOffers.length
      },
      context.requestId
    );
  } catch (error) {
    return createErrorResponse(
      error instanceof BizError ? error : BizError.internalServerError('OfferAPI'),
      context.requestId
    );
  }
});
