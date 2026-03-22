/**
 * Event Revenue API Route
 * GET /api/events/[id]/revenue - Get revenue data for an event
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 5B - Native Ticketing (Revenue Reporting)
 * @tier ENTERPRISE (payment data)
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getEventService, getListingService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

const eventService = getEventService();
const listingService = getListingService();

/**
 * GET /api/events/[id]/revenue
 * Get revenue data and ticket sales for an event.
 *
 * @authenticated Required (listing owner or admin)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const request = context.request;

  // 1. Verify authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required to view revenue data');
  }

  // 2. Extract event ID from URL
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const eventIdIndex = segments.indexOf('events') + 1;
  const id = segments[eventIdIndex];
  if (!id) {
    throw BizError.badRequest('Event ID is required');
  }

  const eventId = parseInt(id);
  if (isNaN(eventId)) {
    throw BizError.badRequest('Invalid event ID', { id });
  }

  // 3. Verify event exists
  const event = await eventService.getById(eventId);
  if (!event) {
    throw BizError.notFound('Event', String(eventId));
  }

  // 4. Verify authorization: listing owner or admin
  const isAdmin = user.role === 'admin';
  if (!isAdmin && event.listing_id) {
    const listing = await listingService.getById(event.listing_id);
    if (!listing || listing.user_id !== user.id) {
      throw BizError.forbidden('You can only view revenue for your own events');
    }
  } else if (!isAdmin && !event.listing_id) {
    throw BizError.forbidden('Revenue data not available for community events');
  }

  // 5. Get revenue and sales data
  const revenue = await eventService.getEventRevenue(eventId);

  // Parse page from query string
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '25');
  const status = url.searchParams.get('status') as string | undefined;

  const sales = await eventService.getEventTicketSales(eventId, {
    page,
    limit,
    status: status as 'pending' | 'completed' | 'failed' | 'refunded' | 'partially_refunded' | undefined,
  });

  return createSuccessResponse({
    revenue,
    sales: { items: sales.items, total: sales.total },
  }, context.requestId);
}, {
  allowedMethods: ['GET']
});
