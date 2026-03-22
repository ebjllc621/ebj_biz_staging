/**
 * Event Waitlist Manage API Route
 *
 * GET /api/events/[id]/waitlist/manage - Get full waitlist for owner/admin views
 *
 * @authority PHASE_3_RSVP_ATTENDEE_MANAGEMENT.md - Task 3.3.4
 * @governance Build Map v2.1 ENHANCED compliance
 * @governance Ownership verification required
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getEventService, getListingService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/events/[id]/waitlist/manage
 * Get full waitlist for owner/admin views (includes user details)
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

  // Extract event ID from URL: /api/events/[id]/waitlist/manage
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const eventIdStr = segments[2]; // api=0, events=1, [id]=2

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
        BizError.forbidden('view waitlist for events you do not own'),
        context.requestId
      );
    }

    // Get full waitlist with user details
    const waitlist = await eventService.getWaitlistForEvent(eventId);

    return createSuccessResponse(
      { waitlist, count: waitlist.length },
      context.requestId
    );
  } catch (error) {
    return createErrorResponse(
      error instanceof BizError ? error : BizError.internalServerError('EventWaitlistManageAPI'),
      context.requestId
    );
  }
}, {
  requireAuth: true,
  allowedMethods: ['GET']
});
