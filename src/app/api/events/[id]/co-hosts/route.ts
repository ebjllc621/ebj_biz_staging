/**
 * Event Co-Hosts API Route
 *
 * GET /api/events/[id]/co-hosts - Get co-hosts for an event (public: active only, owner: all)
 * POST /api/events/[id]/co-hosts - Invite a listing as co-host (auth: event owner)
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 6A - Co-Host System
 */

import { getEventService, getListingService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import type { EventCoHostRole } from '@features/events/types';

/**
 * GET /api/events/[id]/co-hosts
 * Public: active co-hosts only. Owner/admin: all statuses via includeAll param.
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

  const co_hosts = await eventService.getEventCoHosts(eventId, showAll);

  return createSuccessResponse({ co_hosts });
});

/**
 * POST /api/events/[id]/co-hosts
 * Auth required — event owner only
 * Body: { co_host_listing_id, co_host_role, invitation_message? }
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
    co_host_listing_id?: unknown;
    co_host_role?: unknown;
    display_order?: unknown;
    invitation_message?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse('Invalid request body', 400);
  }

  const coHostListingId = Number(body.co_host_listing_id);
  if (!coHostListingId || isNaN(coHostListingId)) {
    return createErrorResponse('co_host_listing_id is required', 400);
  }

  const validRoles: EventCoHostRole[] = ['organizer', 'vendor', 'performer', 'exhibitor'];
  const coHostRole = body.co_host_role as EventCoHostRole;
  if (!coHostRole || !validRoles.includes(coHostRole)) {
    return createErrorResponse('co_host_role must be one of: organizer, vendor, performer, exhibitor', 400);
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
      return createErrorResponse('Only the event owner can invite co-hosts', 403);
    }
  }

  try {
    const co_host = await eventService.createCoHost({
      event_id: eventId,
      co_host_listing_id: coHostListingId,
      co_host_role: coHostRole,
      display_order: body.display_order !== undefined ? Number(body.display_order) : undefined,
      invitation_message: typeof body.invitation_message === 'string' ? body.invitation_message.trim() : undefined,
    }, Number(user.id));

    return createSuccessResponse({ co_host }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already a co-host')) {
      return createErrorResponse(error.message, 409);
    }
    if (error instanceof Error && error.message.includes('limit reached')) {
      return createErrorResponse(error.message, 403);
    }
    throw error;
  }
});
