/**
 * Event Check-In API Route
 *
 * GET /api/events/[id]/check-in - Get check-in stats and list
 * POST /api/events/[id]/check-in - Check in an attendee
 *
 * @authority Phase 4 Check-In System Brain Plan
 * @governance Build Map v2.1 ENHANCED compliance
 * @governance CSRF protection on POST
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getEventService, getListingService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import type { CheckInMethod } from '@features/events/types';

/**
 * GET /api/events/[id]/check-in
 * Returns check-in stats + full check-in list.
 * Requires auth + event ownership or admin.
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(BizError.unauthorized('Unauthorized'), context.requestId);
  }

  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  // Path: /api/events/[id]/check-in → id is segment before 'check-in'
  const checkInIndex = segments.indexOf('check-in');
  const eventIdStr = checkInIndex > 0 ? segments[checkInIndex - 1] : undefined;

  if (!eventIdStr) {
    return createErrorResponse(BizError.badRequest('Event ID is required', {}), context.requestId);
  }

  const eventId = parseInt(eventIdStr);
  if (isNaN(eventId)) {
    return createErrorResponse(BizError.badRequest('Invalid event ID', { id: eventIdStr }), context.requestId);
  }

  const listingService = getListingService();
  const eventService = getEventService();

  try {
    const event = await eventService.getById(eventId);
    if (!event) {
      return createErrorResponse(BizError.notFound('Event', eventId), context.requestId);
    }

    // Verify user owns the listing or is admin
    if (user.role !== 'admin') {
      if (!event.listing_id) {
        return createErrorResponse(BizError.forbidden('view check-ins for this event'), context.requestId);
      }
      const listing = await listingService.getById(event.listing_id);
      if (!listing || listing.user_id !== user.id) {
        return createErrorResponse(BizError.forbidden('view check-ins for events you do not own'), context.requestId);
      }
    }

    const [stats, checkIns] = await Promise.all([
      eventService.getCheckInStats(eventId),
      eventService.getEventCheckIns(eventId),
    ]);

    return createSuccessResponse({ stats, checkIns }, context.requestId);
  } catch (error) {
    return createErrorResponse(
      error instanceof BizError ? error : BizError.internalServerError('EventCheckInAPI'),
      context.requestId
    );
  }
}, {
  requireAuth: true,
  allowedMethods: ['GET']
});

/**
 * POST /api/events/[id]/check-in
 * Check in an attendee.
 * Body: { rsvpId, method, checkInCode? }
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(BizError.unauthorized('Unauthorized'), context.requestId);
  }

  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const checkInIndex = segments.indexOf('check-in');
  const eventIdStr = checkInIndex > 0 ? segments[checkInIndex - 1] : undefined;

  if (!eventIdStr) {
    return createErrorResponse(BizError.badRequest('Event ID is required', {}), context.requestId);
  }

  const eventId = parseInt(eventIdStr);
  if (isNaN(eventId)) {
    return createErrorResponse(BizError.badRequest('Invalid event ID', { id: eventIdStr }), context.requestId);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse(BizError.badRequest('Invalid JSON in request body'), context.requestId);
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return createErrorResponse(BizError.badRequest('Request body must be an object'), context.requestId);
  }

  const requestBody = body as Record<string, unknown>;

  if (!requestBody.rsvpId || typeof requestBody.rsvpId !== 'number') {
    return createErrorResponse(
      BizError.validation('rsvpId', requestBody.rsvpId, 'rsvpId is required and must be a number'),
      context.requestId
    );
  }

  const validMethods: CheckInMethod[] = ['qr_scan', 'manual', 'self'];
  const method = requestBody.method as CheckInMethod;
  if (!method || !validMethods.includes(method)) {
    return createErrorResponse(
      BizError.validation('method', method, 'method must be one of: qr_scan, manual, self'),
      context.requestId
    );
  }

  const listingService = getListingService();
  const eventService = getEventService();

  try {
    const event = await eventService.getById(eventId);
    if (!event) {
      return createErrorResponse(BizError.notFound('Event', eventId), context.requestId);
    }

    // For self check-in: user verifies their own code
    if (method === 'self') {
      const checkInCode = requestBody.checkInCode as string | undefined;
      if (!checkInCode) {
        return createErrorResponse(
          BizError.badRequest('checkInCode is required for self check-in'),
          context.requestId
        );
      }
      const isValid = await eventService.verifyCheckInCode(checkInCode, requestBody.rsvpId as number);
      if (!isValid) {
        return createErrorResponse(
          BizError.badRequest('Invalid check-in code'),
          context.requestId
        );
      }
      const checkIn = await eventService.checkInAttendee(eventId, requestBody.rsvpId as number, method, user.id);
      return createSuccessResponse({ checkIn }, context.requestId);
    }

    // For qr_scan or manual: verify user owns the listing or is admin
    if (user.role !== 'admin') {
      if (!event.listing_id) {
        return createErrorResponse(BizError.forbidden('check in attendees for this event'), context.requestId);
      }
      const listing = await listingService.getById(event.listing_id);
      if (!listing || listing.user_id !== user.id) {
        return createErrorResponse(BizError.forbidden('check in attendees for events you do not own'), context.requestId);
      }
    }

    const checkIn = await eventService.checkInAttendee(
      eventId,
      requestBody.rsvpId as number,
      method,
      user.id
    );

    return createSuccessResponse({ checkIn }, context.requestId);
  } catch (error) {
    return createErrorResponse(
      error instanceof BizError ? error : BizError.internalServerError('EventCheckInAPI'),
      context.requestId
    );
  }
}, {
  requireAuth: true,
  allowedMethods: ['GET', 'POST']
}));
