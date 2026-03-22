/**
 * Event Sponsor Analytics API Route
 *
 * GET /api/events/[id]/sponsors/[sponsorId]/analytics
 * Auth: event owner or the sponsoring listing owner
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse/createErrorResponse
 * - Authenticated access only
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 5 - Task 5.5: Sponsor Analytics Route
 */

import { getEventService, getListingService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';

/**
 * GET /api/events/[id]/sponsors/[sponsorId]/analytics
 * Auth: event owner or the sponsoring listing owner
 * Returns click/impression analytics for all sponsors of the event
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  const url = new URL(request.url);
  const parts = url.pathname.split('/');
  // path: /api/events/[id]/sponsors/[sponsorId]/analytics
  const eventId = parseInt(parts[parts.length - 4] ?? '');
  const sponsorId = parseInt(parts[parts.length - 2] ?? '');

  if (isNaN(eventId) || isNaN(sponsorId)) {
    return createErrorResponse('Invalid event or sponsor ID', 400);
  }

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  const eventService = getEventService();

  if (user.role !== 'admin') {
    const event = await eventService.getById(eventId);
    if (!event) {
      return createErrorResponse('Event not found', 404);
    }

    const listingService = getListingService();

    // Allow event owner
    if (!event.listing_id) {
      return createErrorResponse('Event has no associated listing', 400);
    }
    const eventListing = await listingService.getById(event.listing_id);
    const isEventOwner = eventListing && eventListing.user_id === Number(user.id);

    // Allow the sponsoring listing owner — need to find which listing this sponsor represents
    const sponsors = await eventService.getEventSponsors(eventId);
    const thisSponsor = sponsors.find(s => s.id === sponsorId);
    let isSponsorOwner = false;
    if (thisSponsor) {
      const sponsorListing = await listingService.getById(thisSponsor.sponsor_listing_id);
      isSponsorOwner = !!(sponsorListing && sponsorListing.user_id === Number(user.id));
    }

    if (!isEventOwner && !isSponsorOwner) {
      return createErrorResponse('Access denied: must be event owner or sponsor owner', 403);
    }
  }

  const analytics = await eventService.getSponsorAnalytics(eventId);

  return createSuccessResponse({ analytics });
});
