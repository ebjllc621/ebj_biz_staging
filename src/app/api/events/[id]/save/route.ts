/**
 * Event Save API Routes
 * GET /api/events/[id]/save - Check if event is saved by current user
 * POST /api/events/[id]/save - Save event bookmark
 * DELETE /api/events/[id]/save - Remove event bookmark
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - withCsrf: MANDATORY for state-changing operations
 * - requireAuth: true for POST/DELETE
 * - DatabaseService boundary: Service layer handles all DB operations
 *
 * @authority CLAUDE.md - API Standards section
 * @phase Phase 2 - RSVP & Engagement UI
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getEventService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { withCsrf } from '@/lib/security/withCsrf';

const eventService = getEventService();

/**
 * Extract event ID from URL pathname (segment before 'save')
 */
function extractEventId(url: URL): number {
  const segments = url.pathname.split('/');
  const saveIndex = segments.indexOf('save');
  const id = saveIndex > 0 ? segments[saveIndex - 1] : null;

  if (!id) {
    throw BizError.badRequest('Event ID is required');
  }

  const eventId = parseInt(id);
  if (isNaN(eventId)) {
    throw BizError.badRequest('Invalid event ID', { id });
  }

  return eventId;
}

/**
 * GET /api/events/[id]/save
 * Check if the current authenticated user has saved this event.
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const eventId = extractEventId(url);

  const user = await getUserFromRequest(context.request);

  if (!user) {
    return createSuccessResponse({ saved: false }, context.requestId);
  }

  const saved = await eventService.isEventSaved(eventId, user.id);

  return createSuccessResponse({ saved }, context.requestId);
}, {
  allowedMethods: ['GET', 'POST', 'DELETE']
});

/**
 * POST /api/events/[id]/save
 * Save an event bookmark for the authenticated user.
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const eventId = extractEventId(url);

  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required to save events');
  }

  await eventService.saveEvent(eventId, user.id);

  return createSuccessResponse({ saved: true }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET', 'POST', 'DELETE']
}));

/**
 * DELETE /api/events/[id]/save
 * Remove a saved event bookmark for the authenticated user.
 */
export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const eventId = extractEventId(url);

  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required to unsave events');
  }

  await eventService.unsaveEvent(eventId, user.id);

  return createSuccessResponse({ saved: false }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET', 'POST', 'DELETE']
}));
