/**
 * Event Ticket Checkout API Route
 * POST /api/events/[id]/tickets/checkout - Create Stripe Checkout Session
 *
 * Creates a pending purchase record and redirects user to Stripe hosted checkout.
 *
 * @authority CLAUDE.md - API Standards, Security
 * @phase Phase 5A - Native Ticketing
 * @tier ENTERPRISE (payment processing)
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getEventService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { withCsrf } from '@/lib/security/withCsrf';
import { stripe } from '@core/config/stripe';

const eventService = getEventService();

/**
 * POST /api/events/[id]/tickets/checkout
 * Create Stripe Checkout Session for ticket purchase
 *
 * @authenticated Required
 * @csrf Required (fetchWithCsrf)
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // Auth check
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required to purchase tickets'),
      context.requestId
    );
  }

  // Extract event ID from URL
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  // URL: /api/events/[id]/tickets/checkout
  const idIndex = segments.indexOf('events') + 1;
  const id = segments[idIndex];
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
    body = await request.json();
  } catch {
    throw BizError.badRequest('Invalid JSON in request body');
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw BizError.badRequest('Request body must be an object');
  }

  const requestBody = body as Record<string, unknown>;

  if (!requestBody.ticket_id || typeof requestBody.ticket_id !== 'number') {
    throw BizError.validation('ticket_id', requestBody.ticket_id, 'ticket_id is required and must be a number');
  }

  const ticketId = requestBody.ticket_id;
  const quantity = typeof requestBody.quantity === 'number' ? requestBody.quantity : 1;

  if (quantity < 1 || quantity > 10) {
    throw BizError.badRequest('Quantity must be between 1 and 10');
  }

  // Verify event exists, is published, is ticketed
  const event = await eventService.getById(eventId);
  if (!event) {
    throw BizError.notFound('Event', eventId);
  }
  if (event.status !== 'published') {
    throw BizError.badRequest('Event is not available for ticket purchase');
  }
  if (!event.is_ticketed) {
    throw BizError.badRequest('This event does not require tickets');
  }

  // Verify tier allows native ticketing (requires listing)
  if (!event.listing_id) {
    throw BizError.badRequest('Community events do not support native ticketing');
  }
  const tierAccess = await eventService.checkTierFeatureAccess(event.listing_id);
  if (!tierAccess.allowNativeTicketing) {
    throw BizError.forbidden('Native ticketing is not available for this tier');
  }

  // Get ticket tier info for Stripe line item
  const tickets = await eventService.getAvailableTickets(eventId);
  const selectedTicket = tickets.find(t => t.id === ticketId);
  if (!selectedTicket) {
    throw BizError.badRequest('Selected ticket tier is not available or sold out');
  }

  // Create pending purchase record
  const purchase = await eventService.createTicketPurchase({
    event_id: eventId,
    ticket_id: ticketId,
    user_id: user.id,
    quantity,
  });

  // Create Stripe Checkout Session
  const baseUrl = url.origin;
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${event.title} - ${selectedTicket.ticket_name}`,
            description: `Ticket for ${event.title}`,
          },
          unit_amount: Math.round(selectedTicket.ticket_price * 100), // Stripe uses cents
        },
        quantity,
      },
    ],
    success_url: `${baseUrl}/events/${event.slug}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/events/${event.slug}/purchase/cancel`,
    customer_email: user.email,
    metadata: {
      purchase_id: String(purchase.id),
      event_id: String(eventId),
      ticket_id: String(ticketId),
      user_id: String(user.id),
    },
  });

  // Update purchase with Stripe session ID
  await eventService.updateTicketPurchaseSessionId(purchase.id, session.id);

  return createSuccessResponse({
    checkout_url: session.url,
    purchase_id: purchase.id,
  }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST']
}));
