/**
 * Event Series API Route
 * GET /api/events/[id]/series - Get all instances in a recurring series
 *
 * Returns the parent event and all child instances ordered by series_index.
 * Public endpoint — same auth as event detail.
 *
 * @phase Phase 3B: Recurring Events
 * @authority docs/pages/layouts/integrationPointRef/events/phases/PHASE_3B_PLAN.md
 * @tier STANDARD
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getEventService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { jsonMethodNotAllowed } from '@/lib/http/json';

/**
 * GET /api/events/[id]/series
 *
 * Returns all events in a recurring series:
 * - If [id] is a parent event: returns parent + all child instances
 * - If [id] is a child instance: finds parent and returns parent + all siblings
 *
 * Response: { parent: Event, events: Event[], total: number }
 *
 * @public No authentication required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  // URL pattern: /api/events/[id]/series — id is second-to-last segment
  const id = segments[segments.length - 2];

  if (!id) {
    throw BizError.badRequest('Event ID is required');
  }

  const eventId = parseInt(id);
  if (isNaN(eventId)) {
    throw BizError.badRequest('Invalid event ID', { id });
  }

  const eventService = getEventService();

  // Get the event — determine if it's a parent or child
  const event = await eventService.getById(eventId);
  if (!event) {
    throw BizError.notFound('Event', eventId);
  }

  let parentEventId: number;

  if (event.parent_event_id) {
    // This is a child instance — use its parent
    parentEventId = event.parent_event_id;
  } else if (event.is_recurring) {
    // This is the parent
    parentEventId = eventId;
  } else {
    // Not a recurring event
    return createSuccessResponse(
      { parent: event, events: [], total: 0 },
      context.requestId
    );
  }

  // Get parent event
  const parent = await eventService.getById(parentEventId);
  if (!parent) {
    throw BizError.notFound('Parent event', parentEventId);
  }

  // Get all child instances
  const instances = await eventService.getSeriesEvents(parentEventId);

  return createSuccessResponse(
    {
      parent,
      events: instances,
      total: instances.length,
    },
    context.requestId
  );
}, {
  allowedMethods: ['GET']
});

// Method guards
const ALLOWED_METHODS = ['GET'];

export async function POST() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PUT() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PATCH() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function DELETE() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}
