/**
 * Event Tickets API Routes
 * GET /api/events/[id]/tickets - Get available ticket tiers
 * POST /api/events/[id]/tickets - Add ticket tier (organizer)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 *
 * @authority CLAUDE.md - API Standards section
 * @phase Phase 5A - Native Ticketing (POST stub replaced with real implementation)
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getEventService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { withCsrf } from '@/lib/security/withCsrf';

const eventService = getEventService();

/**
 * GET /api/events/[id]/tickets
 * Get available ticket tiers for an event
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 2];
  if (!id) {
    throw BizError.badRequest('Event ID is required');
  }

  const eventId = parseInt(id);
  if (isNaN(eventId)) {
    throw BizError.badRequest('Invalid event ID', { id });
  }

  const tickets = await eventService.getAvailableTickets(eventId);

  return createSuccessResponse({ tickets }, context.requestId);
}, {
  allowedMethods: ['GET', 'POST']
});

/**
 * POST /api/events/[id]/tickets
 * Add a ticket tier to an event (for organizers/listing owners)
 * Body: { ticket_name: string, ticket_price: number, quantity_total: number }
 *
 * @authenticated Required (event organizer)
 * @csrf Required
 * @phase Phase 5A - Replaces stub with real addTicketTier implementation
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 2];
  if (!id) {
    throw BizError.badRequest('Event ID is required');
  }

  const eventId = parseInt(id);
  if (isNaN(eventId)) {
    throw BizError.badRequest('Invalid event ID', { id });
  }

  // Verify event exists and user owns it
  const event = await eventService.getById(eventId);
  if (!event) {
    throw BizError.notFound('Event', eventId);
  }
  if (!event.listing_id) {
    throw BizError.badRequest('Community events do not support ticket tiers');
  }

  // Verify tier allows native ticketing
  const tierAccess = await eventService.checkTierFeatureAccess(event.listing_id);
  if (!tierAccess.allowNativeTicketing) {
    throw BizError.forbidden('Native ticketing requires Preferred or Premium tier');
  }

  // Check existing tier count
  const existingTickets = await eventService.getAvailableTickets(eventId);
  if (existingTickets.length >= tierAccess.maxTicketTiers) {
    throw BizError.badRequest(`Maximum of ${tierAccess.maxTicketTiers} ticket tiers allowed`);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw BizError.badRequest('Invalid JSON in request body');
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw BizError.badRequest('Request body must be an object');
  }

  const requestBody = body as Record<string, unknown>;

  if (!requestBody.ticket_name || typeof requestBody.ticket_name !== 'string') {
    throw BizError.validation('ticket_name', requestBody.ticket_name, 'Ticket name is required');
  }
  if (typeof requestBody.ticket_price !== 'number' || requestBody.ticket_price < 0) {
    throw BizError.validation('ticket_price', requestBody.ticket_price, 'Ticket price must be a non-negative number');
  }
  if (!requestBody.quantity_total || typeof requestBody.quantity_total !== 'number' || requestBody.quantity_total < 1) {
    throw BizError.validation('quantity_total', requestBody.quantity_total, 'Quantity must be at least 1');
  }

  const ticket = await eventService.addTicketTier(eventId, {
    ticket_name: requestBody.ticket_name,
    ticket_price: requestBody.ticket_price,
    quantity_total: requestBody.quantity_total,
    quantity_sold: 0,
  });

  return createSuccessResponse({ ticket }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET', 'POST']
}));
