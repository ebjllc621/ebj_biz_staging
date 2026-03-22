/**
 * Admin Event Exhibitors API Route
 *
 * GET /api/admin/events/exhibitors - List all exhibitor relationships with filtering (admin only)
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 6B - Exhibitor System
 */

import { getEventService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';

/**
 * GET /api/admin/events/exhibitors
 * Admin only — list all event exhibitors with filtering and pagination
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
  const booth_size = url.searchParams.get('booth_size') || '';
  const sortColumn = url.searchParams.get('sortColumn') || 'created_at';
  const sortDirection = url.searchParams.get('sortDirection') || 'desc';

  const eventService = getEventService();
  const { exhibitors, total } = await eventService.getAdminExhibitors({
    page,
    pageSize,
    search,
    status,
    booth_size,
    sortColumn,
    sortDirection,
  });

  return createSuccessResponse({
    exhibitors,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});
