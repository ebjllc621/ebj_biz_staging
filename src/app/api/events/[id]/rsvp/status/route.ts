/**
 * Event RSVP Status API Route
 * GET /api/events/[id]/rsvp/status - Check if current user has RSVP'd
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - No requireAuth: Returns default for unauthenticated users
 *
 * @authority CLAUDE.md - API Standards section
 * @phase Phase 2 - RSVP & Engagement UI
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getEventService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';

const eventService = getEventService();

/**
 * GET /api/events/[id]/rsvp/status
 * Check if the current authenticated user has RSVP'd to this event.
 * Returns default { has_rsvped: false, rsvp_status: null } for unauthenticated users.
 */
export const GET = apiHandler(async (context: ApiContext) => {
  // Extract event ID from URL pathname (segment before 'rsvp')
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  // Path: /api/events/[id]/rsvp/status — id is 3 segments before end
  const rsvpIndex = segments.indexOf('rsvp');
  const id = rsvpIndex > 0 ? segments[rsvpIndex - 1] : null;

  if (!id) {
    throw BizError.badRequest('Event ID is required');
  }

  const eventId = parseInt(id);
  if (isNaN(eventId)) {
    throw BizError.badRequest('Invalid event ID', { id });
  }

  // Get user from session (no auth required — returns null for unauthenticated)
  const user = await getUserFromRequest(context.request);

  const responseData: { has_rsvped: boolean; rsvp_status: string | null } = {
    has_rsvped: false,
    rsvp_status: null
  };

  if (user) {
    const hasRsvped = await eventService.hasRsvped(eventId, user.id);
    responseData.has_rsvped = hasRsvped;

    if (hasRsvped) {
      // Get the RSVP record to return status
      const rsvps = await eventService.getRsvps(eventId);
      const userRsvp = rsvps.find((r) => r.user_id === user.id);
      responseData.rsvp_status = userRsvp ? userRsvp.rsvp_status : 'confirmed';
    }
  }

  return createSuccessResponse(responseData, context.requestId);
}, {
  allowedMethods: ['GET']
});
