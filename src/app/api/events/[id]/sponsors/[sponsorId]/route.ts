/**
 * Event Sponsor Management API Route
 *
 * PATCH /api/events/[id]/sponsors/[sponsorId] - Update sponsor (auth: event owner or admin)
 * DELETE /api/events/[id]/sponsors/[sponsorId] - Remove sponsor (auth: event owner or admin)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse/createErrorResponse
 * - Authenticated access only
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 5 - Task 5.4: Sponsor Management Routes
 */

import { getEventService, getListingService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import type { EventSponsorTier, EventSponsorStatus } from '@features/events/types';

/** Extract event ID and sponsor ID from the URL path */
function extractIds(url: URL): { eventId: number; sponsorId: number } | null {
  const parts = url.pathname.split('/');
  // path: /api/events/[id]/sponsors/[sponsorId]
  const sponsorId = parseInt(parts[parts.length - 1] ?? '');
  const eventId = parseInt(parts[parts.length - 3] ?? '');
  if (isNaN(eventId) || isNaN(sponsorId)) return null;
  return { eventId, sponsorId };
}

/**
 * PATCH /api/events/[id]/sponsors/[sponsorId]
 * Auth: event owner or admin
 */
export const PATCH = apiHandler(async (context) => {
  const { request } = context;

  const url = new URL(request.url);
  const ids = extractIds(url);
  if (!ids) {
    return createErrorResponse('Invalid event or sponsor ID', 400);
  }
  const { eventId, sponsorId } = ids;

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
      return createErrorResponse('Only the event owner or admin can update sponsors', 403);
    }
  }

  let body: {
    sponsor_tier?: unknown;
    display_order?: unknown;
    sponsor_logo?: unknown;
    sponsor_message?: unknown;
    status?: unknown;
    start_date?: unknown;
    end_date?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse('Invalid request body', 400);
  }

  const validTiers: EventSponsorTier[] = ['title', 'gold', 'silver', 'bronze', 'community'];
  const validStatuses: EventSponsorStatus[] = ['pending', 'active', 'expired', 'cancelled'];

  if (body.sponsor_tier !== undefined && !validTiers.includes(body.sponsor_tier as EventSponsorTier)) {
    return createErrorResponse('Invalid sponsor_tier value', 400);
  }
  if (body.status !== undefined && !validStatuses.includes(body.status as EventSponsorStatus)) {
    return createErrorResponse('Invalid status value', 400);
  }

  try {
    const updated = await eventService.updateEventSponsor(sponsorId, {
      sponsor_tier: body.sponsor_tier as EventSponsorTier | undefined,
      display_order: body.display_order !== undefined ? Number(body.display_order) : undefined,
      sponsor_logo: typeof body.sponsor_logo === 'string' ? body.sponsor_logo : undefined,
      sponsor_message: typeof body.sponsor_message === 'string' ? body.sponsor_message.trim() : undefined,
      status: body.status as EventSponsorStatus | undefined,
      start_date: typeof body.start_date === 'string' ? body.start_date : undefined,
      end_date: typeof body.end_date === 'string' ? body.end_date : undefined,
    });

    return createSuccessResponse({ sponsor: updated });
  } catch (error) {
    if (error instanceof Error && error.message === 'Sponsor not found') {
      return createErrorResponse('Sponsor not found', 404);
    }
    throw error;
  }
});

/**
 * DELETE /api/events/[id]/sponsors/[sponsorId]
 * Auth: event owner or admin
 */
export const DELETE = apiHandler(async (context) => {
  const { request } = context;

  const url = new URL(request.url);
  const ids = extractIds(url);
  if (!ids) {
    return createErrorResponse('Invalid event or sponsor ID', 400);
  }
  const { eventId, sponsorId } = ids;

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
      return createErrorResponse('Only the event owner or admin can remove sponsors', 403);
    }
  }

  await eventService.deleteEventSponsor(sponsorId);

  return createSuccessResponse({ deleted: true });
});
