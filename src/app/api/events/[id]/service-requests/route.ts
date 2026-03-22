/**
 * Event Service Requests API Route
 *
 * GET /api/events/[id]/service-requests - Get service requests for an event (auth: event owner)
 * POST /api/events/[id]/service-requests - Create a service request for an event (auth: event owner, Preferred/Premium)
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 6C - Service Procurement (Quote Integration)
 */

import { getEventService, getListingService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import type { EventServiceCategory, EventServiceRequestPriority } from '@features/events/types';

const VALID_SERVICE_CATEGORIES: EventServiceCategory[] = [
  'catering', 'av_equipment', 'security', 'decor', 'photography',
  'entertainment', 'transportation', 'venue_services', 'cleaning', 'staffing', 'other',
];

const VALID_PRIORITIES: EventServiceRequestPriority[] = ['low', 'medium', 'high', 'urgent'];

/**
 * GET /api/events/[id]/service-requests
 * Auth required — event owner only (service requests are internal procurement)
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2];

  if (!id) {
    return createErrorResponse('Event ID is required', 400);
  }

  const eventId = parseInt(id);
  if (isNaN(eventId)) {
    return createErrorResponse('Invalid event ID', 400);
  }

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  const eventService = getEventService();

  // Verify event exists and user owns it (or is admin)
  if (user.role !== 'admin') {
    const event = await eventService.getById(eventId);
    if (!event) {
      return createErrorResponse('Event not found', 404);
    }
    if (!event.listing_id) {
      return createErrorResponse('Event has no associated listing', 400);
    }
    const listingService = getListingService();
    const listing = await listingService.getById(event.listing_id);
    if (!listing || listing.user_id !== Number(user.id)) {
      return createErrorResponse('Only the event owner can view service requests', 403);
    }
  }

  const service_requests = await eventService.getEventServiceRequests(eventId);

  return createSuccessResponse({ service_requests });
});

/**
 * POST /api/events/[id]/service-requests
 * Auth required — event owner only, Preferred/Premium tier
 * Body: { service_category, title, description?, required_by_date?, budget_min?, budget_max?, priority?, notes? }
 */
export const POST = apiHandler(async (context) => {
  const { request } = context;

  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2];

  if (!id) {
    return createErrorResponse('Event ID is required', 400);
  }

  const eventId = parseInt(id);
  if (isNaN(eventId)) {
    return createErrorResponse('Invalid event ID', 400);
  }

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  let body: {
    service_category?: unknown;
    title?: unknown;
    description?: unknown;
    required_by_date?: unknown;
    budget_min?: unknown;
    budget_max?: unknown;
    priority?: unknown;
    notes?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse('Invalid request body', 400);
  }

  // Validate required fields
  if (!body.service_category || typeof body.service_category !== 'string') {
    return createErrorResponse('service_category is required', 400);
  }
  if (!VALID_SERVICE_CATEGORIES.includes(body.service_category as EventServiceCategory)) {
    return createErrorResponse(`service_category must be one of: ${VALID_SERVICE_CATEGORIES.join(', ')}`, 400);
  }

  if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
    return createErrorResponse('title is required', 400);
  }
  if (body.title.toString().trim().length > 500) {
    return createErrorResponse('title must be 500 characters or fewer', 400);
  }

  if (body.description && typeof body.description === 'string' && body.description.length > 2000) {
    return createErrorResponse('description must be 2000 characters or fewer', 400);
  }

  if (body.priority && !VALID_PRIORITIES.includes(body.priority as EventServiceRequestPriority)) {
    return createErrorResponse(`priority must be one of: ${VALID_PRIORITIES.join(', ')}`, 400);
  }

  const budgetMin = body.budget_min != null ? Number(body.budget_min) : undefined;
  const budgetMax = body.budget_max != null ? Number(body.budget_max) : undefined;

  if (budgetMin !== undefined && (isNaN(budgetMin) || budgetMin < 0)) {
    return createErrorResponse('budget_min must be a non-negative number', 400);
  }
  if (budgetMax !== undefined && (isNaN(budgetMax) || budgetMax < 0)) {
    return createErrorResponse('budget_max must be a non-negative number', 400);
  }

  const eventService = getEventService();

  // Verify event exists and user owns it
  if (user.role !== 'admin') {
    const event = await eventService.getById(eventId);
    if (!event) {
      return createErrorResponse('Event not found', 404);
    }
    if (!event.listing_id) {
      return createErrorResponse('Event has no associated listing', 400);
    }
    const listingService = getListingService();
    const listing = await listingService.getById(event.listing_id);
    if (!listing || listing.user_id !== Number(user.id)) {
      return createErrorResponse('Only the event owner can create service requests', 403);
    }
  }

  try {
    const service_request = await eventService.createServiceRequest(
      {
        event_id: eventId,
        service_category: body.service_category as EventServiceCategory,
        title: String(body.title).trim(),
        description: typeof body.description === 'string' ? body.description.trim() : undefined,
        required_by_date: typeof body.required_by_date === 'string' ? body.required_by_date : undefined,
        budget_min: budgetMin,
        budget_max: budgetMax,
        priority: body.priority as EventServiceRequestPriority | undefined,
        notes: typeof body.notes === 'string' ? body.notes.trim() : undefined,
      },
      Number(user.id)
    );

    return createSuccessResponse({ service_request }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists for this event')) {
      return createErrorResponse(error.message, 409);
    }
    if (error instanceof Error && error.message.includes('limit reached')) {
      return createErrorResponse(error.message, 403);
    }
    if (error instanceof Error && error.message.includes('Preferred or Premium tier')) {
      return createErrorResponse(error.message, 403);
    }
    throw error;
  }
});
