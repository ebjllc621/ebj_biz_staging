/**
 * Event Exhibitors API Route
 *
 * GET /api/events/[id]/exhibitors - Get exhibitors for an event (public: active only, owner: all)
 * POST /api/events/[id]/exhibitors - Invite a listing as exhibitor (auth: event owner)
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 6B - Exhibitor System
 */

import { getEventService, getListingService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import type { ExhibitorBoothSize } from '@features/events/types';

/**
 * GET /api/events/[id]/exhibitors
 * Public: active exhibitors only. Owner/admin: all statuses via includeAll param.
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

  const exhibitors = await eventService.getEventExhibitors(eventId, showAll);

  return createSuccessResponse({ exhibitors });
});

/**
 * POST /api/events/[id]/exhibitors
 * Auth required — event owner only
 * Body: { exhibitor_listing_id, booth_number?, booth_size?, exhibitor_description?, invitation_message? }
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
    exhibitor_listing_id?: unknown;
    booth_number?: unknown;
    booth_size?: unknown;
    exhibitor_description?: unknown;
    invitation_message?: unknown;
    display_order?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse('Invalid request body', 400);
  }

  const exhibitorListingId = Number(body.exhibitor_listing_id);
  if (!exhibitorListingId || isNaN(exhibitorListingId)) {
    return createErrorResponse('exhibitor_listing_id is required', 400);
  }

  const validBoothSizes: ExhibitorBoothSize[] = ['small', 'medium', 'large', 'premium'];
  const boothSize = body.booth_size as ExhibitorBoothSize | undefined;
  if (boothSize && !validBoothSizes.includes(boothSize)) {
    return createErrorResponse('booth_size must be one of: small, medium, large, premium', 400);
  }

  const eventService = getEventService();

  // Verify event exists and user owns the listing
  if (user.role !== 'admin') {
    const event = await eventService.getById(eventId);
    if (!event) {
      return createErrorResponse('Event not found', 404);
    }

    const listingService = getListingService();
    if (!event.listing_id) {
      return createErrorResponse('Event has no associated listing', 400);
    }
    const listing = await listingService.getById(event.listing_id);
    if (!listing || listing.user_id !== Number(user.id)) {
      return createErrorResponse('Only the event owner can invite exhibitors', 403);
    }
  }

  try {
    const exhibitor = await eventService.createExhibitor({
      event_id: eventId,
      exhibitor_listing_id: exhibitorListingId,
      booth_number: typeof body.booth_number === 'string' ? body.booth_number.trim() : undefined,
      booth_size: boothSize,
      exhibitor_description: typeof body.exhibitor_description === 'string' ? body.exhibitor_description.trim() : undefined,
      invitation_message: typeof body.invitation_message === 'string' ? body.invitation_message.trim() : undefined,
      display_order: body.display_order !== undefined ? Number(body.display_order) : undefined,
    }, Number(user.id));

    return createSuccessResponse({ exhibitor }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already an exhibitor')) {
      return createErrorResponse(error.message, 409);
    }
    if (error instanceof Error && error.message.includes('limit reached')) {
      return createErrorResponse(error.message, 403);
    }
    throw error;
  }
});
