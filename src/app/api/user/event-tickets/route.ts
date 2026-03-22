/**
 * User Event Tickets API Route
 * GET /api/user/event-tickets - Get authenticated user's purchased tickets
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 5B - Native Ticketing (My Tickets)
 * @tier STANDARD
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getEventService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

const eventService = getEventService();

/**
 * GET /api/user/event-tickets
 * Get the authenticated user's purchased tickets enriched with event details.
 *
 * @authenticated Required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const request = context.request;

  // 1. Verify authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required to view purchased tickets');
  }

  // 2. Get enriched purchases
  const tickets = await eventService.getUserTicketPurchasesEnriched(user.id);

  return createSuccessResponse({ tickets }, context.requestId);
}, {
  allowedMethods: ['GET']
});
