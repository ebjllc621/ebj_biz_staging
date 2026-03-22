/**
 * User Events API Route
 * GET /api/user/events - Get authenticated user's events by tab
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - requireAuth: true - authentication required
 *
 * @authority CLAUDE.md - API Standards section
 * @phase Phase 6A - Dashboard My Events Page
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getEventService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import type { MyEventsTab } from '@features/events/types';

const eventService = getEventService();

/**
 * GET /api/user/events
 * Returns paginated event list for the authenticated user filtered by tab.
 *
 * Query params:
 *   tab: 'upcoming' | 'saved' | 'past' | 'created'  (default: 'upcoming')
 *   page: number (default: 1)
 *   limit: number (default: 10, max: 50)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);

  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  const url = new URL(context.request.url);
  const searchParams = url.searchParams;

  const tab = (searchParams.get('tab') ?? 'upcoming') as MyEventsTab;
  const validTabs: MyEventsTab[] = ['upcoming', 'saved', 'past', 'created'];
  if (!validTabs.includes(tab)) {
    throw BizError.badRequest('Invalid tab value', { tab });
  }

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limitRaw = parseInt(searchParams.get('limit') ?? '10', 10) || 10;
  const limit = Math.min(50, Math.max(1, limitRaw));

  let items;
  let total: number;

  switch (tab) {
    case 'upcoming': {
      const result = await eventService.getUserUpcomingEvents(user.id, page, limit);
      items = result.items;
      total = result.total;
      break;
    }
    case 'saved': {
      const result = await eventService.getUserSavedEventsWithDetails(user.id, page, limit);
      items = result.items;
      total = result.total;
      break;
    }
    case 'past': {
      const result = await eventService.getUserPastEvents(user.id, page, limit);
      items = result.items;
      total = result.total;
      break;
    }
    case 'created': {
      const result = await eventService.getUserCreatedEvents(user.id, page, limit);
      items = result.items;
      total = result.total;
      break;
    }
  }

  const totalPages = Math.ceil(total / limit);

  return createSuccessResponse(
    {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    },
    context.requestId
  );
}, {
  allowedMethods: ['GET'],
  requireAuth: true,
});
