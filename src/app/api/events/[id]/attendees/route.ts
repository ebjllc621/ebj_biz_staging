/**
 * Event Attendees API Route
 *
 * GET /api/events/[id]/attendees - Get event attendees
 *
 * @authority PHASE_5.4.1_BRAIN_PLAN.md - Task 2.2
 * @governance Build Map v2.1 ENHANCED compliance
 * @governance Ownership verification required
 */

// PATTERN: Imports from @reference src/app/api/listings/route.ts
import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getEventService, getListingService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/events/[id]/attendees
 * Get event attendees
 *
 * @governance Authentication required (listing_member or admin)
 * @governance Ownership verification (user must own the listing)
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

  // Extract event ID from URL
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const eventIdStr = segments[segments.length - 2]; // Get event ID (before 'attendees')

  if (!eventIdStr) {
    return createErrorResponse(
      BizError.badRequest('Event ID is required', {}),
      context.requestId
    );
  }

  const eventId = parseInt(eventIdStr);
  if (isNaN(eventId)) {
    return createErrorResponse(
      BizError.badRequest('Invalid event ID', { id: eventIdStr }),
      context.requestId
    );
  }

  // PATTERN: Service initialization from @reference POST /api/listings (lines 102-114)
  
  
  
  const listingService = getListingService();
  const eventService = getEventService();

  try {
    // Verify event exists
    const event = await eventService.getById(eventId);
    if (!event) {
      return createErrorResponse(
        BizError.notFound('Event', eventId),
        context.requestId
      );
    }

    // GOVERNANCE: Verify user owns the listing
    if (!event.listing_id) {
      return createErrorResponse(
        BizError.badRequest('Event has no associated listing'),
        context.requestId
      );
    }
    const listing = await listingService.getById(event.listing_id);
    if (!listing || listing.user_id !== user.id) {
      return createErrorResponse(
        BizError.forbidden('view attendees for events you do not own'),
        context.requestId
      );
    }

    // Get attendees with user details (Phase 3 enhancement)
    const attendees = await eventService.getAttendeesWithDetails(eventId);

    return createSuccessResponse(
      {
        attendees,
        count: attendees.length
      },
      context.requestId
    );
  } catch (error) {
    return createErrorResponse(
      error instanceof BizError ? error : BizError.internalServerError('EventAttendeesAPI'),
      context.requestId
    );
  }
}, {
  requireAuth: true,
  allowedMethods: ['GET']
});
