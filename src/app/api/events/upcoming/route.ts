/**
 * Upcoming Events API Route
 * GET /api/events/upcoming - Get upcoming events
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

/**
 * GET /api/events/upcoming
 * Get upcoming events (events with start_date in the future)
 * Query parameters:
 *   - listingId: Filter by listing ID (optional)
 *   - limit: Number of events to return (optional, default: 10)
 *
 * @public No authentication required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { searchParams } = new URL(context.request.url);

  let listingId: number | undefined;
  const listingIdParam = searchParams.get('listingId');
  if (listingIdParam !== null) {
    listingId = parseInt(listingIdParam);
    if (isNaN(listingId)) {
      throw BizError.badRequest('Invalid listingId parameter', { listingId: listingIdParam });
    }
  }

  const limit = parseInt(searchParams.get('limit') || '10');
  if (isNaN(limit) || limit < 1 || limit > 100) {
    throw BizError.badRequest('Invalid limit parameter (must be 1-100)', { limit: searchParams.get('limit') });
  }

  
  
  
  const listingService = getListingService();
  const eventService = getEventService();

  // getUpcoming() only accepts limit - use getAll() for listing filter
  let events;
  if (listingId !== undefined) {
    const result = await eventService.getAll(
      { listingId, isUpcoming: true },
      { page: 1, limit }
    );
    events = result.data;
  } else {
    events = await eventService.getUpcoming(limit);
  }

  return createSuccessResponse({ events }, context.requestId);
}, {
  allowedMethods: ['GET']
});
