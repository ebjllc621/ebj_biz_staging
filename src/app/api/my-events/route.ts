/**
 * My Events API Route - Get user's events across all listings
 *
 * GET /api/my-events - Get all events for user's listings
 *
 * @authority PHASE_5.4.1_BRAIN_PLAN.md - Task 2.2
 * @governance Build Map v2.1 ENHANCED compliance
 * @pattern Phase 5.4 API route pattern with tier enforcement
 */

// PATTERN: Imports from @reference src/app/api/listings/route.ts
import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getEventService, getListingService } from '@core/services/ServiceRegistry';
import { getUserFromRequest, isListingMember } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/my-events - Get user's events across all listings
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
      BizError.forbidden('manage events'),
      context.requestId
    );
  }

  // PATTERN: Service initialization from @reference POST /api/listings (lines 102-114)
  
  
  
  const listingService = getListingService();
  const eventService = getEventService();

  try {
    // Get all user's listings
    const userListings = await listingService.getAll({ userId: user.id });
    const listings = userListings.data || [];
    const listingIds = listings.map((l: { id: number }) => l.id);

    // Get all events for user's listings
    const allEvents = [];
    for (const listingId of listingIds) {
      const listingEvents = await eventService.getAll({ listingId });
      allEvents.push(...(listingEvents.data || []));
    }

    // Enrich with listing names
    const enrichedEvents = allEvents.map((event) => {
      const listing = listings.find((l: { id: number }) => l.id === event.listing_id);
      return {
        ...event,
        listing_name: listing?.name || 'Unknown Listing'
      };
    });

    return createSuccessResponse(
      {
        events: enrichedEvents,
        count: enrichedEvents.length
      },
      context.requestId
    );
  } catch (error) {
    return createErrorResponse(
      error instanceof BizError ? error : BizError.internalServerError('EventAPI'),
      context.requestId
    );
  }
});
