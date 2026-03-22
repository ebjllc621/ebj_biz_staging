/**
 * Event Check-In QR Data API Route
 *
 * GET /api/events/[id]/check-in/qr - Get QR data for authenticated user's RSVP
 *
 * @authority Phase 4 Check-In System Brain Plan
 * @governance Build Map v2.1 ENHANCED compliance
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getEventService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/events/[id]/check-in/qr
 * Returns QR code data for the authenticated user's confirmed RSVP.
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(BizError.unauthorized('Unauthorized'), context.requestId);
  }

  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  // Path: /api/events/[id]/check-in/qr → id is 3 segments before end
  const qrIndex = segments.indexOf('qr');
  const checkInIndex = qrIndex > 0 ? qrIndex - 1 : -1;
  const eventIdStr = checkInIndex > 0 ? segments[checkInIndex - 1] : undefined;

  if (!eventIdStr) {
    return createErrorResponse(BizError.badRequest('Event ID is required', {}), context.requestId);
  }

  const eventId = parseInt(eventIdStr);
  if (isNaN(eventId)) {
    return createErrorResponse(BizError.badRequest('Invalid event ID', { id: eventIdStr }), context.requestId);
  }

  const eventService = getEventService();

  try {
    const qrData = await eventService.getAttendeeCheckInQR(eventId, user.id);
    return createSuccessResponse(qrData, context.requestId);
  } catch (error) {
    return createErrorResponse(
      error instanceof BizError ? error : BizError.internalServerError('EventCheckInQRAPI'),
      context.requestId
    );
  }
}, {
  requireAuth: true,
  allowedMethods: ['GET']
});
