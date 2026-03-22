/**
 * Event RSVP API Routes
 * POST /api/events/[id]/rsvp - RSVP to event
 * DELETE /api/events/[id]/rsvp - Cancel RSVP
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 *
 * @authority CLAUDE.md - API Standards section
 * @authority Phase 4 Brain Plan - API Endpoint Layer Implementation
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getEventService, getListingService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

// Initialize services



const listingService = getListingService();
const eventService = getEventService();

/**
 * POST /api/events/[id]/rsvp
 * RSVP to event
 * Body:
 *   - user_id: User ID (required)
 *   - notes: Optional RSVP notes
 *
 * @authenticated User authentication required
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  // Extract event ID from URL pathname
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 2]; // Get ID from path (before 'rsvp')
  if (!id) {
    throw BizError.badRequest('Event ID is required');
  }

  const eventId = parseInt(id);
  if (isNaN(eventId)) {
    throw BizError.badRequest('Invalid event ID', { id });
  }

  // Parse request body
  let body: unknown;
  try {
    body = await context.request.json();
  } catch (error) {
    throw BizError.badRequest('Invalid JSON in request body');
  }

  // Validate body is an object
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw BizError.badRequest('Request body must be an object');
  }

  const requestBody = body as Record<string, unknown>;

  if (!requestBody.user_id || typeof requestBody.user_id !== 'number') {
    throw BizError.validation('user_id', requestBody.user_id, 'User ID is required and must be a number');
  }

  const rsvp = await eventService.rsvp(eventId, requestBody.user_id as number, requestBody.ticket_id as number | undefined);

  // Auto-generate check-in code for check-in-enabled events
  try {
    const eventForCheckIn = await eventService.getById(eventId);
    if (eventForCheckIn && eventForCheckIn.check_in_enabled && rsvp.id) {
      await eventService.generateCheckInCode(rsvp.id);
    }
  } catch (checkInErr) {
    console.error('[EventRSVP] Check-in code generation failed:', checkInErr);
  }

  // Dispatch RSVP notifications (non-blocking)
  try {
    const { EventNotificationService } = await import('@core/services/notification/EventNotificationService');
    const { getNotificationService } = await import('@core/services/ServiceRegistry');
    const { getDatabaseService } = await import('@core/services/DatabaseService');
    const notificationService = getNotificationService();
    const eventNotificationService = new EventNotificationService(getDatabaseService(), notificationService);

    // RSVP confirmation notification
    await eventNotificationService.notifyRsvpConfirmed(eventId, requestBody.user_id as number);

    // Capacity alert notifications
    const event = await eventService.getById(eventId);
    if (event && event.total_capacity) {
      const capacityRatio = event.rsvp_count / event.total_capacity;
      if (capacityRatio >= 1.0 || (event.remaining_capacity !== null && event.remaining_capacity <= 0)) {
        await eventNotificationService.notifyEventFull(eventId);
      } else if (capacityRatio >= 0.8) {
        await eventNotificationService.notifyNearingCapacity(eventId);
        // Notify saved-event users if capacity is getting low (<20% remaining)
        if (event.remaining_capacity !== null && event.total_capacity > 0 && event.remaining_capacity / event.total_capacity < 0.2) {
          await eventNotificationService.notifySavedEventFillingUp(eventId);
        }
      }
    }
  } catch (notifyError) {
    // Log but don't fail the RSVP if notification fails
    console.error('[EventRSVP] Notification failed:', notifyError);
  }

  return createSuccessResponse({ rsvp }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST', 'DELETE']
}));

/**
 * DELETE /api/events/[id]/rsvp
 * Cancel RSVP
 * Query parameters:
 *   - userId: User ID (required)
 *
 * @authenticated User authentication required
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  // Extract event ID from URL pathname
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 2]; // Get ID from path (before 'rsvp')
  if (!id) {
    throw BizError.badRequest('Event ID is required');
  }

  const eventId = parseInt(id);
  if (isNaN(eventId)) {
    throw BizError.badRequest('Invalid event ID', { id });
  }

  const { searchParams } = url;
  const userIdParam = searchParams.get('userId');

  if (!userIdParam) {
    throw BizError.badRequest('userId query parameter is required');
  }

  const userId = parseInt(userIdParam);
  if (isNaN(userId)) {
    throw BizError.badRequest('Invalid userId parameter', { userId: userIdParam });
  }

  await eventService.cancelRsvp(eventId, userId);

  return createSuccessResponse({ message: 'RSVP cancelled successfully' }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST', 'DELETE']
}));
