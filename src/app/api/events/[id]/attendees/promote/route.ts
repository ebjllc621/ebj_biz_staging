/**
 * Event Waitlist Promote API Route
 *
 * POST /api/events/[id]/attendees/promote - Promote user from waitlist to confirmed RSVP
 *
 * @authority PHASE_3_RSVP_ATTENDEE_MANAGEMENT.md - Task 3.3.2
 * @governance Build Map v2.1 ENHANCED compliance
 * @governance Ownership verification required
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getEventService, getListingService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

/**
 * POST /api/events/[id]/attendees/promote
 * Promote a user from waitlist to confirmed RSVP
 *
 * @governance Authentication required (listing_member or admin)
 * @governance Ownership verification (user must own the listing)
 */
export const POST = apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // GOVERNANCE: Extract user session
  const user = await getUserFromRequest(request);

  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Unauthorized'),
      context.requestId
    );
  }

  // Extract event ID from URL: /api/events/[id]/attendees/promote
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

  // Parse request body
  let body: { user_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse(
      BizError.badRequest('Invalid request body', {}),
      context.requestId
    );
  }

  const userId = typeof body.user_id === 'number' ? body.user_id : parseInt(String(body.user_id));
  if (isNaN(userId) || userId <= 0) {
    return createErrorResponse(
      BizError.badRequest('Valid user_id is required', {}),
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
        BizError.forbidden('promote waitlist users for events you do not own'),
        context.requestId
      );
    }

    // Promote user from waitlist
    const rsvp = await eventService.promoteFromWaitlist(eventId, userId);

    return createSuccessResponse(
      { rsvp, message: 'User promoted from waitlist' },
      context.requestId
    );
  } catch (error) {
    return createErrorResponse(
      error instanceof BizError ? error : BizError.internalServerError('EventPromoteAPI'),
      context.requestId
    );
  }
}, {
  requireAuth: true,
  allowedMethods: ['POST']
});
