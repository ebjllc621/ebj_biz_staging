/**
 * Event Detail API Routes
 * GET /api/events/[id] - Get event by ID
 * PATCH /api/events/[id] - Update event
 * DELETE /api/events/[id] - Delete event
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
 * GET /api/events/[id]
 * Get event by ID
 *
 * @public No authentication required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  // Extract event ID from URL pathname
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 1]; // Get last segment
  if (!id) {
    throw BizError.badRequest('Event ID is required');
  }

  const eventId = parseInt(id);
  if (isNaN(eventId)) {
    throw BizError.badRequest('Invalid event ID', { id });
  }

  const event = await eventService.getById(eventId);

  return createSuccessResponse({ event }, context.requestId);
}, {
  allowedMethods: ['GET', 'PATCH', 'DELETE']
});

/**
 * PUT /api/events/[id]
 * Update event (user-facing - Phase 5.4.1)
 *
 * @governance Ownership verification required
 * @governance Authentication required
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const PUT = withCsrf(apiHandler(async (context: ApiContext) => {
  // Extract event ID from URL pathname
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 1]; // Get last segment
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

  // Phase 3B: Handle recurrence pattern updates on parent events
  const recurrencePatternChanged =
    requestBody.recurrence_type !== undefined ||
    requestBody.recurrence_days !== undefined ||
    requestBody.recurrence_end_date !== undefined;

  if (recurrencePatternChanged) {
    const existingEvent = await eventService.getById(eventId);
    if (existingEvent?.is_recurring && !existingEvent.parent_event_id) {
      // This is a parent recurring event — regenerate future instances
      try {
        await eventService.updateRecurringSeries(eventId, {
          recurrence_type: requestBody.recurrence_type as string | undefined,
          recurrence_days: requestBody.recurrence_days as number[] | undefined,
          recurrence_end_date: requestBody.recurrence_end_date as string | undefined,
        });
      } catch (seriesError) {
        console.error('[EventUpdate] Failed to update recurring series:', seriesError);
      }
    }
  }

  // Update event
  await eventService.update(eventId, requestBody);

  // Dispatch update notifications for significant field changes (non-blocking)
  const significantFields = ['start_date', 'end_date', 'venue_name', 'address', 'virtual_link', 'location_type'];
  const hasSignificantChange = significantFields.some(f => requestBody[f] !== undefined);
  if (hasSignificantChange) {
    try {
      const { EventNotificationService } = await import('@core/services/notification/EventNotificationService');
      const { getNotificationService } = await import('@core/services/ServiceRegistry');
      const { getDatabaseService } = await import('@core/services/DatabaseService');
      const notificationService = getNotificationService();
      const eventNotificationService = new EventNotificationService(getDatabaseService(), notificationService);
      await eventNotificationService.notifyEventUpdated(eventId, {
        dateChanged: requestBody.start_date !== undefined || requestBody.end_date !== undefined,
        venueChanged: requestBody.venue_name !== undefined || requestBody.address !== undefined,
        description: 'Event details have been updated'
      });
    } catch (notifyError) {
      console.error('[EventUpdate] Update notification failed:', notifyError);
    }
  }

  return createSuccessResponse({ message: 'Event updated successfully' }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET', 'PUT', 'PATCH', 'DELETE']
}));

/**
 * PATCH /api/events/[id]
 * Update event (admin-facing)
 * Body: Partial event update fields
 *
 * @authenticated User authentication required
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  // Extract event ID from URL pathname
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 1]; // Get last segment
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

  // Fetch existing event to detect status changes
  const existing = await eventService.getById(eventId);

  // Update event
  const event = await eventService.update(eventId, requestBody);

  // If status changed to 'published', broadcast to followers
  if (requestBody.status === 'published' && existing && existing.status !== 'published') {
    try {
      const { EventNotificationService } = await import('@core/services/notification/EventNotificationService');
      const { getNotificationService } = await import('@core/services/ServiceRegistry');
      const { getDatabaseService } = await import('@core/services/DatabaseService');
      const notificationService = getNotificationService();
      const eventNotificationService = new EventNotificationService(getDatabaseService(), notificationService);
      await eventNotificationService.notifyEventPublished(eventId, existing.listing_id!);
    } catch (notifyError) {
      console.error('[EventUpdate] Publish broadcast failed:', notifyError);
    }
  }

  // If status changed to 'cancelled', notify RSVPed users
  if (requestBody.status === 'cancelled' && existing && existing.status !== 'cancelled') {
    try {
      const { EventNotificationService } = await import('@core/services/notification/EventNotificationService');
      const { getNotificationService } = await import('@core/services/ServiceRegistry');
      const { getDatabaseService } = await import('@core/services/DatabaseService');
      const notificationService = getNotificationService();
      const eventNotificationService = new EventNotificationService(getDatabaseService(), notificationService);
      await eventNotificationService.notifyEventCancelled(eventId);
    } catch (notifyError) {
      console.error('[EventUpdate] Cancellation notification failed:', notifyError);
    }
  }

  return createSuccessResponse({ event }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET', 'PATCH', 'DELETE']
}));

/**
 * DELETE /api/events/[id]
 * Delete event
 *
 * @authenticated User authentication required
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  // Extract event ID from URL pathname
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 1]; // Get last segment
  if (!id) {
    throw BizError.badRequest('Event ID is required');
  }

  const eventId = parseInt(id);
  if (isNaN(eventId)) {
    throw BizError.badRequest('Invalid event ID', { id });
  }

  await eventService.delete(eventId);

  return createSuccessResponse({ message: 'Event deleted successfully' }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET', 'PATCH', 'DELETE']
}));
