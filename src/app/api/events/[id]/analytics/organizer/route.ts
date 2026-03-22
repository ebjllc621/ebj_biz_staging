/**
 * Organizer Analytics API Route
 *
 * GET /api/events/[id]/analytics/organizer
 * Returns organizer workflow analytics for a specific event (auth required, owner/admin only)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse
 * - Authentication: required (event owner or admin)
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 6D - Organizer Analytics
 */

import { getEventService, getListingService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';

/**
 * GET /api/events/[id]/analytics/organizer
 * Get organizer workflow analytics for a specific event
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Extract event ID from URL path: .../events/[id]/analytics/organizer
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  // Path: /api/events/{id}/analytics/organizer — id is at index -3
  const id = pathParts[pathParts.length - 3];

  if (!id) {
    return createErrorResponse('Event ID is required', 400);
  }

  const eventId = parseInt(id);
  if (isNaN(eventId)) {
    return createErrorResponse('Invalid event ID', 400);
  }

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  const eventService = getEventService();

  // Verify event exists
  const event = await eventService.getById(eventId);
  if (!event) {
    return createErrorResponse('Event not found', 404);
  }

  // Verify ownership or admin
  if (user.role !== 'admin') {
    if (!event.listing_id) {
      return createErrorResponse('Event has no associated listing', 400);
    }
    const listingService = getListingService();
    const listing = await listingService.getById(event.listing_id);
    if (!listing || listing.user_id !== user.id) {
      return createErrorResponse('You do not have permission to view organizer analytics for this event', 403);
    }
  }

  const organizer_analytics = await eventService.getOrganizerAnalytics(eventId);

  return createSuccessResponse({ organizer_analytics });
});
