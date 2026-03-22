/**
 * Event Sponsors API Route
 *
 * GET /api/events/[id]/sponsors - Get active sponsors for an event (public)
 * POST /api/events/[id]/sponsors - Add a sponsor to an event (auth: event owner)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse/createErrorResponse
 * - Public access for GET, authenticated for POST
 * - CSRF protection via apiHandler on POST
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 5 - Task 5.3: Public Sponsor Routes
 */

import { getEventService, getListingService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import type { EventSponsorTier } from '@features/events/types';

/**
 * GET /api/events/[id]/sponsors
 * Public endpoint — no authentication required
 * Returns active sponsors ordered by tier rank
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2];
  const includeAll = url.searchParams.get('includeAll') === 'true';

  if (!id) {
    return createErrorResponse('Event ID is required', 400);
  }

  const eventId = parseInt(id);
  if (isNaN(eventId)) {
    return createErrorResponse('Invalid event ID', 400);
  }

  const eventService = getEventService();

  // If includeAll requested, verify user is event owner or admin
  let showAll = false;
  if (includeAll) {
    const user = await getUserFromRequest(request);
    if (user) {
      if (user.role === 'admin') {
        showAll = true;
      } else {
        const event = await eventService.getById(eventId);
        if (event) {
          const listingService = getListingService();
          const listing = event.listing_id ? await listingService.getById(event.listing_id) : null;
          if (listing && listing.user_id === Number(user.id)) {
            showAll = true;
          }
        }
      }
    }
  }

  const sponsors = await eventService.getEventSponsors(eventId, showAll);

  return createSuccessResponse({ sponsors });
});

/**
 * POST /api/events/[id]/sponsors
 * Auth required — event owner only
 * Body: { sponsor_listing_id, sponsor_tier, display_order?, sponsor_logo?, sponsor_message?, start_date?, end_date? }
 */
export const POST = apiHandler(async (context) => {
  const { request } = context;

  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2];

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

  let body: {
    sponsor_listing_id?: unknown;
    sponsor_tier?: unknown;
    display_order?: unknown;
    sponsor_logo?: unknown;
    sponsor_message?: unknown;
    start_date?: unknown;
    end_date?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse('Invalid request body', 400);
  }

  const sponsorListingId = Number(body.sponsor_listing_id);
  if (!sponsorListingId || isNaN(sponsorListingId)) {
    return createErrorResponse('sponsor_listing_id is required', 400);
  }

  const validTiers: EventSponsorTier[] = ['title', 'gold', 'silver', 'bronze', 'community'];
  const sponsorTier = body.sponsor_tier as EventSponsorTier;
  if (!sponsorTier || !validTiers.includes(sponsorTier)) {
    return createErrorResponse('sponsor_tier must be one of: title, gold, silver, bronze, community', 400);
  }

  const eventService = getEventService();

  // Verify event exists and user owns the listing for this event
  if (user.role !== 'admin') {
    const event = await eventService.getById(eventId);
    if (!event) {
      return createErrorResponse('Event not found', 404);
    }

    // Check ownership: listing must be owned by this user
    const listingService = getListingService();
    if (!event.listing_id) {
      return createErrorResponse('Event has no associated listing', 400);
    }
    const listing = await listingService.getById(event.listing_id);
    if (!listing || listing.user_id !== Number(user.id)) {
      return createErrorResponse('Only the event owner can add sponsors', 403);
    }
  }

  try {
    const sponsor = await eventService.createEventSponsor({
      event_id: eventId,
      sponsor_listing_id: sponsorListingId,
      sponsor_tier: sponsorTier,
      display_order: body.display_order !== undefined ? Number(body.display_order) : undefined,
      sponsor_logo: typeof body.sponsor_logo === 'string' ? body.sponsor_logo : undefined,
      sponsor_message: typeof body.sponsor_message === 'string' ? body.sponsor_message.trim() : undefined,
      start_date: typeof body.start_date === 'string' ? body.start_date : undefined,
      end_date: typeof body.end_date === 'string' ? body.end_date : undefined,
    });

    return createSuccessResponse({ sponsor }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already a sponsor')) {
      return createErrorResponse(error.message, 409);
    }
    throw error;
  }
});
