/**
 * User Calendar Events API Route
 * GET /api/user/events/calendar - Get authenticated user's events by date range
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - requireAuth: true - authentication required
 *
 * @authority CLAUDE.md - API Standards section
 * @phase Phase 6B - Dashboard Calendar & .ics Export
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getEventService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';

const eventService = getEventService();

/**
 * GET /api/user/events/calendar
 * Returns all user-related events within a date range for calendar display.
 *
 * Query params:
 *   start: ISO date string (required) — range start
 *   end: ISO date string (required) — range end
 *
 * Response shape:
 * {
 *   success: true,
 *   data: {
 *     items: CalendarEvent[],
 *     range: { start: string, end: string }
 *   },
 *   requestId: string
 * }
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  const url = new URL(context.request.url);
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');

  if (!start || !end) {
    throw BizError.badRequest('start and end query params required');
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw BizError.badRequest('Invalid date format');
  }

  const items = await eventService.getUserCalendarEvents(user.id, start, end);

  return createSuccessResponse(
    { items, range: { start, end } },
    context.requestId
  );
}, {
  allowedMethods: ['GET'],
  requireAuth: true,
});
