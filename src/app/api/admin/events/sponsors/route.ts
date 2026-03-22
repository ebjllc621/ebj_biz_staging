/**
 * Admin Event Sponsors API Route
 *
 * GET /api/admin/events/sponsors - List all sponsor relationships with filtering (admin only)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse/createErrorResponse
 * - Admin authentication required
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 5 - Task 5.6: Admin Sponsor Routes
 */

import { getEventService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';

/**
 * GET /api/admin/events/sponsors
 * Admin only — list all event sponsors with filtering and pagination
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }
  if (user.role !== 'admin') {
    return createErrorResponse('Admin privileges required', 403);
  }

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20'), 100);
  const search = url.searchParams.get('search') || '';
  const status = url.searchParams.get('status') || '';
  const sponsor_tier = url.searchParams.get('sponsor_tier') || '';
  const sortColumn = url.searchParams.get('sortColumn') || 'created_at';
  const sortDirection = url.searchParams.get('sortDirection') || 'desc';

  const eventService = getEventService();
  const { sponsors, total } = await eventService.getAdminSponsors({
    page,
    pageSize,
    search,
    status,
    sponsor_tier,
    sortColumn,
    sortDirection,
  });

  return createSuccessResponse({
    sponsors,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});
