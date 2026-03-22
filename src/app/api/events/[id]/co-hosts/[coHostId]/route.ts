/**
 * Event Co-Host Management API Route
 *
 * PATCH /api/events/[id]/co-hosts/[coHostId] - Update co-host (status, role)
 * DELETE /api/events/[id]/co-hosts/[coHostId] - Remove co-host
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 6A - Co-Host System
 */

import { getEventService, getListingService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import type { EventCoHostRole, EventCoHostStatus } from '@features/events/types';

/** Extract event ID and co-host ID from the URL path */
function extractIds(url: URL): { eventId: number; coHostId: number } | null {
  const parts = url.pathname.split('/');
  // path: /api/events/[id]/co-hosts/[coHostId]
  const coHostId = parseInt(parts[parts.length - 1] ?? '');
  const eventId = parseInt(parts[parts.length - 3] ?? '');
  if (isNaN(eventId) || isNaN(coHostId)) return null;
  return { eventId, coHostId };
}

/**
 * PATCH /api/events/[id]/co-hosts/[coHostId]
 * Auth: event owner (for role/remove) or co-host listing owner (for accept/decline)
 */
export const PATCH = apiHandler(async (context) => {
  const { request } = context;

  const url = new URL(request.url);
  const ids = extractIds(url);
  if (!ids) {
    return createErrorResponse('Invalid event or co-host ID', 400);
  }
  const { eventId, coHostId } = ids;

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  const eventService = getEventService();

  // Fetch co-host by ID to determine authorization
  const coHostResult = await eventService.getEventCoHosts(eventId, true);
  const coHost = coHostResult.find(ch => ch.id === coHostId);
  if (!coHost) {
    return createErrorResponse('Co-host not found', 404);
  }

  let body: {
    status?: unknown;
    co_host_role?: unknown;
    display_order?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse('Invalid request body', 400);
  }

  const validRoles: EventCoHostRole[] = ['organizer', 'vendor', 'performer', 'exhibitor'];
  const validStatuses: EventCoHostStatus[] = ['pending', 'active', 'declined', 'removed'];

  if (body.co_host_role !== undefined && !validRoles.includes(body.co_host_role as EventCoHostRole)) {
    return createErrorResponse('Invalid co_host_role value', 400);
  }
  if (body.status !== undefined && !validStatuses.includes(body.status as EventCoHostStatus)) {
    return createErrorResponse('Invalid status value', 400);
  }

  // Authorization logic:
  // - Accept/decline (status='active'/'declined'): co-host listing owner
  // - Role/order change or status='removed': event owner
  if (user.role !== 'admin') {
    const newStatus = body.status as EventCoHostStatus | undefined;
    if (newStatus === 'active' || newStatus === 'declined') {
      // Verify user owns the co-host listing (accepting own invitation)
      const listingService = getListingService();
      const coHostListing = await listingService.getById(coHost.co_host_listing_id);
      if (!coHostListing || coHostListing.user_id !== Number(user.id)) {
        return createErrorResponse('Only the co-host listing owner can accept/decline invitations', 403);
      }
    } else {
      // Verify user owns the event's listing (event owner manages)
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
        return createErrorResponse('Only the event owner can update co-hosts', 403);
      }
    }
  }

  try {
    const updated = await eventService.updateCoHost(coHostId, {
      co_host_role: body.co_host_role as EventCoHostRole | undefined,
      display_order: body.display_order !== undefined ? Number(body.display_order) : undefined,
      status: body.status as EventCoHostStatus | undefined,
    });

    return createSuccessResponse({ co_host: updated });
  } catch (error) {
    if (error instanceof Error && error.message === 'Co-host not found') {
      return createErrorResponse('Co-host not found', 404);
    }
    throw error;
  }
});

/**
 * DELETE /api/events/[id]/co-hosts/[coHostId]
 * Auth: event owner or admin
 */
export const DELETE = apiHandler(async (context) => {
  const { request } = context;

  const url = new URL(request.url);
  const ids = extractIds(url);
  if (!ids) {
    return createErrorResponse('Invalid event or co-host ID', 400);
  }
  const { eventId, coHostId } = ids;

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  const eventService = getEventService();

  // Ownership check for non-admins
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
      return createErrorResponse('Only the event owner or admin can remove co-hosts', 403);
    }
  }

  await eventService.removeCoHost(coHostId);

  return createSuccessResponse({ deleted: true });
});
