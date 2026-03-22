/**
 * Event Service Request Detail API Route
 *
 * PATCH /api/events/[id]/service-requests/[requestId] - Update a service request
 * DELETE /api/events/[id]/service-requests/[requestId] - Remove a service request
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 6C - Service Procurement (Quote Integration)
 */

import { NextRequest } from 'next/server';
import { getEventService, getListingService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import type { EventServiceRequestPriority, EventServiceRequestStatus } from '@features/events/types';

const VALID_PRIORITIES: EventServiceRequestPriority[] = ['low', 'medium', 'high', 'urgent'];
const VALID_STATUSES: EventServiceRequestStatus[] = ['draft', 'open', 'in_progress', 'fulfilled', 'cancelled'];

/**
 * Verify the requesting user owns the event associated with the service request
 * Returns the listing_id if verified, throws/returns error response otherwise
 */
async function verifyOwnership(
  request: NextRequest,
  eventId: number
): Promise<{ userId: number } | Response> {
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  if (user.role === 'admin') {
    return { userId: Number(user.id) };
  }

  const eventService = getEventService();
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
    return createErrorResponse('Only the event owner can manage service requests', 403);
  }

  return { userId: Number(user.id) };
}

/**
 * PATCH /api/events/[id]/service-requests/[requestId]
 * Auth required — event owner only
 * When status transitions from 'draft' to 'open', creates the linked quote via QuoteService
 */
export const PATCH = apiHandler(async (context) => {
  const { request } = context;

  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const rawRequestId = pathParts[pathParts.length - 1] ?? '';
  const requestId = parseInt(rawRequestId);
  const id = pathParts[pathParts.length - 3] ?? '';

  if (!id || isNaN(parseInt(id))) {
    return createErrorResponse('Event ID is required', 400);
  }
  if (isNaN(requestId)) {
    return createErrorResponse('Invalid request ID', 400);
  }

  const eventId = parseInt(id);

  const ownershipResult = await verifyOwnership(request, eventId);
  if (ownershipResult instanceof Response) return ownershipResult;
  const { userId } = ownershipResult;

  let body: {
    title?: unknown;
    description?: unknown;
    required_by_date?: unknown;
    budget_min?: unknown;
    budget_max?: unknown;
    priority?: unknown;
    status?: unknown;
    notes?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse('Invalid request body', 400);
  }

  // Validate optional fields
  if (body.title !== undefined && (typeof body.title !== 'string' || !body.title.trim())) {
    return createErrorResponse('title must be a non-empty string', 400);
  }
  if (body.title && body.title.toString().trim().length > 500) {
    return createErrorResponse('title must be 500 characters or fewer', 400);
  }
  if (body.description && typeof body.description === 'string' && body.description.length > 2000) {
    return createErrorResponse('description must be 2000 characters or fewer', 400);
  }
  if (body.priority && !VALID_PRIORITIES.includes(body.priority as EventServiceRequestPriority)) {
    return createErrorResponse(`priority must be one of: ${VALID_PRIORITIES.join(', ')}`, 400);
  }
  if (body.status && !VALID_STATUSES.includes(body.status as EventServiceRequestStatus)) {
    return createErrorResponse(`status must be one of: ${VALID_STATUSES.join(', ')}`, 400);
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

  try {
    const service_request = await eventService.updateServiceRequest(
      requestId,
      {
        title: typeof body.title === 'string' ? body.title.trim() : undefined,
        description: body.description !== undefined
          ? (typeof body.description === 'string' ? body.description.trim() : null) ?? undefined
          : undefined,
        required_by_date: body.required_by_date !== undefined
          ? (typeof body.required_by_date === 'string' ? body.required_by_date : undefined)
          : undefined,
        budget_min: budgetMin,
        budget_max: budgetMax,
        priority: body.priority as EventServiceRequestPriority | undefined,
        status: body.status as EventServiceRequestStatus | undefined,
        notes: body.notes !== undefined
          ? (typeof body.notes === 'string' ? body.notes.trim() : undefined)
          : undefined,
      },
      userId
    );

    return createSuccessResponse({ service_request });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return createErrorResponse('Service request not found', 404);
    }
    if (error instanceof Error && error.message.includes('No fields to update')) {
      return createErrorResponse('No fields to update', 400);
    }
    throw error;
  }
});

/**
 * DELETE /api/events/[id]/service-requests/[requestId]
 * Auth required — event owner only
 */
export const DELETE = apiHandler(async (context) => {
  const { request } = context;

  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const rawRequestId = pathParts[pathParts.length - 1] ?? '';
  const requestId = parseInt(rawRequestId);
  const id = pathParts[pathParts.length - 3] ?? '';

  if (!id || isNaN(parseInt(id))) {
    return createErrorResponse('Event ID is required', 400);
  }
  if (isNaN(requestId)) {
    return createErrorResponse('Invalid request ID', 400);
  }

  const eventId = parseInt(id);

  const ownershipResult = await verifyOwnership(request, eventId);
  if (ownershipResult instanceof Response) return ownershipResult;

  const eventService = getEventService();

  // Verify the service request exists and belongs to this event
  const existing = await eventService.getServiceRequestById(requestId);
  if (!existing || existing.event_id !== eventId) {
    return createErrorResponse('Service request not found', 404);
  }

  await eventService.removeServiceRequest(requestId);

  return createSuccessResponse({ deleted: true });
});
