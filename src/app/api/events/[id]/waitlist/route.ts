/**
 * Event Waitlist API Routes
 * GET /api/events/[id]/waitlist - Check waitlist position
 * POST /api/events/[id]/waitlist - Join waitlist
 * DELETE /api/events/[id]/waitlist - Leave waitlist
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 8C - Waitlist Feature Completion
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getEventService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { withCsrf } from '@/lib/security/withCsrf';

const eventService = getEventService();

function extractEventId(url: URL): number {
  const segments = url.pathname.split('/');
  const waitlistIndex = segments.indexOf('waitlist');
  const id = waitlistIndex > 0 ? segments[waitlistIndex - 1] : null;

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
 * GET /api/events/[id]/waitlist
 * Check waitlist position for current user (returns defaults for unauth)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const eventId = extractEventId(url);

  const user = await getUserFromRequest(context.request);

  if (!user) {
    return createSuccessResponse({ on_waitlist: false, position: null, total: 0, status: null }, context.requestId);
  }

  const result = await eventService.getWaitlistPosition(eventId, user.id);

  return createSuccessResponse({
    on_waitlist: result.position !== null,
    position: result.position,
    total: result.total,
    status: result.status,
  }, context.requestId);
}, {
  allowedMethods: ['GET', 'POST', 'DELETE']
});

/**
 * POST /api/events/[id]/waitlist
 * Join waitlist (auth required)
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const eventId = extractEventId(url);

  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required to join waitlist');
  }

  try {
    const entry = await eventService.joinWaitlist(eventId, user.id);
    return createSuccessResponse({ on_waitlist: true, position: entry.position, total: 0, entry }, context.requestId);
  } catch (error) {
    if (error instanceof BizError && error.code === 'BAD_REQUEST' && error.message.includes('Already on waitlist')) {
      const current = await eventService.getWaitlistPosition(eventId, user.id);
      return createSuccessResponse({ on_waitlist: true, position: current.position, total: current.total }, context.requestId);
    }
    throw error;
  }
}, {
  requireAuth: true,
  allowedMethods: ['GET', 'POST', 'DELETE']
}));

/**
 * DELETE /api/events/[id]/waitlist
 * Leave waitlist (auth required)
 */
export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const eventId = extractEventId(url);

  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required to leave waitlist');
  }

  await eventService.leaveWaitlist(eventId, user.id);

  return createSuccessResponse({ on_waitlist: false }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET', 'POST', 'DELETE']
}));
