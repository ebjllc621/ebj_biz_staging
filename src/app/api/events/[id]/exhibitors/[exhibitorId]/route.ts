/**
 * Event Exhibitor Individual API Route
 *
 * PATCH /api/events/[id]/exhibitors/[exhibitorId] - Update exhibitor (accept/decline/booth changes)
 * DELETE /api/events/[id]/exhibitors/[exhibitorId] - Remove exhibitor (event owner only)
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 6B - Exhibitor System
 */

import { getEventService, getListingService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import type { EventExhibitorStatus, ExhibitorBoothSize } from '@features/events/types';

/**
 * PATCH /api/events/[id]/exhibitors/[exhibitorId]
 * Auth required.
 * - Event owner: can change booth info, display_order, exhibitor_logo, or set status='removed'
 * - Exhibitor listing owner: can accept ('active') or decline ('declined') their own invitation
 */
export const PATCH = apiHandler(async (context) => {
  const { request } = context;

  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const rawExhibitorId = pathParts[pathParts.length - 1] ?? '';
  const rawEventId = pathParts[pathParts.length - 3] ?? '';
  const exhibitorId = parseInt(rawExhibitorId);
  const eventId = parseInt(rawEventId);

  if (isNaN(eventId) || isNaN(exhibitorId)) {
    return createErrorResponse('Invalid event ID or exhibitor ID', 400);
  }

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  let body: {
    status?: unknown;
    booth_number?: unknown;
    booth_size?: unknown;
    exhibitor_description?: unknown;
    exhibitor_logo?: unknown;
    display_order?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse('Invalid request body', 400);
  }

  const eventService = getEventService();

  // Fetch the exhibitor record to check ownership
  const existing = await eventService.getEventExhibitors(eventId, true);
  const exhibitor = existing.find((ex) => ex.id === exhibitorId);
  if (!exhibitor) {
    return createErrorResponse('Exhibitor not found', 404);
  }

  // Authorization check
  if (user.role !== 'admin') {
    const listingService = getListingService();
    const event = await eventService.getById(eventId);
    if (!event) {
      return createErrorResponse('Event not found', 404);
    }

    const statusChange = body.status as EventExhibitorStatus | undefined;
    const isAcceptDecline = statusChange === 'active' || statusChange === 'declined';

    if (isAcceptDecline) {
      // Exhibitor listing owner accepting/declining their own invitation
      const exhibitorListing = await listingService.getById(exhibitor.exhibitor_listing_id);
      if (!exhibitorListing || exhibitorListing.user_id !== Number(user.id)) {
        return createErrorResponse('Only the invited business owner can accept or decline this invitation', 403);
      }
    } else {
      // Event owner managing booth/order/logo or removing
      if (!event.listing_id) {
        return createErrorResponse('Event has no associated listing', 400);
      }
      const eventListing = await listingService.getById(event.listing_id);
      if (!eventListing || eventListing.user_id !== Number(user.id)) {
        return createErrorResponse('Only the event owner can manage exhibitor details', 403);
      }
    }
  }

  const validBoothSizes: ExhibitorBoothSize[] = ['small', 'medium', 'large', 'premium'];
  const validStatuses: EventExhibitorStatus[] = ['pending', 'active', 'declined', 'removed'];

  const boothSize = body.booth_size as ExhibitorBoothSize | undefined;
  if (boothSize && !validBoothSizes.includes(boothSize)) {
    return createErrorResponse('booth_size must be one of: small, medium, large, premium', 400);
  }

  const status = body.status as EventExhibitorStatus | undefined;
  if (status && !validStatuses.includes(status)) {
    return createErrorResponse('status must be one of: pending, active, declined, removed', 400);
  }

  const updated = await eventService.updateExhibitor(exhibitorId, {
    booth_number: typeof body.booth_number === 'string' ? body.booth_number.trim() : undefined,
    booth_size: boothSize,
    exhibitor_description: typeof body.exhibitor_description === 'string' ? body.exhibitor_description.trim() : undefined,
    exhibitor_logo: typeof body.exhibitor_logo === 'string' ? body.exhibitor_logo.trim() : undefined,
    display_order: body.display_order !== undefined ? Number(body.display_order) : undefined,
    status,
  });

  return createSuccessResponse({ exhibitor: updated });
});

/**
 * DELETE /api/events/[id]/exhibitors/[exhibitorId]
 * Auth required — event owner only
 */
export const DELETE = apiHandler(async (context) => {
  const { request } = context;

  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const rawExhibitorId2 = pathParts[pathParts.length - 1] ?? '';
  const rawEventId2 = pathParts[pathParts.length - 3] ?? '';
  const exhibitorId = parseInt(rawExhibitorId2);
  const eventId = parseInt(rawEventId2);

  if (isNaN(eventId) || isNaN(exhibitorId)) {
    return createErrorResponse('Invalid event ID or exhibitor ID', 400);
  }

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  if (user.role !== 'admin') {
    const eventService = getEventService();
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
      return createErrorResponse('Only the event owner can remove exhibitors', 403);
    }
  }

  const eventService = getEventService();
  await eventService.removeExhibitor(exhibitorId);

  return createSuccessResponse({ deleted: true });
});
