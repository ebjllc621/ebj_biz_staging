/**
 * Admin Event Service Requests API Route
 *
 * GET /api/admin/events/service-requests - List all service requests platform-wide (admin only)
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 6C - Service Procurement (Quote Integration)
 */

import { getEventService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';

/**
 * GET /api/admin/events/service-requests
 * Admin only — list all event service requests with filtering and pagination
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
  const service_category = url.searchParams.get('service_category') || '';
  const priority = url.searchParams.get('priority') || '';
  const sortColumn = url.searchParams.get('sortColumn') || 'created_at';
  const sortDirection = url.searchParams.get('sortDirection') || 'desc';

  const eventService = getEventService();
  const { service_requests, total } = await eventService.getAllServiceRequestsAdmin({
    page,
    pageSize,
    search,
    status,
    service_category,
    priority,
    sortColumn,
    sortDirection,
  });

  return createSuccessResponse({
    service_requests,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});
