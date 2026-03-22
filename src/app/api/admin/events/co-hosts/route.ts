/**
 * Admin Event Co-Hosts API Route
 *
 * GET /api/admin/events/co-hosts - List all co-host relationships with filtering (admin only)
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 6A - Co-Host System
 */

import { getEventService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';

/**
 * GET /api/admin/events/co-hosts
 * Admin only — list all event co-hosts with filtering and pagination
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
  const co_host_role = url.searchParams.get('co_host_role') || '';
  const sortColumn = url.searchParams.get('sortColumn') || 'created_at';
  const sortDirection = url.searchParams.get('sortDirection') || 'desc';

  const eventService = getEventService();
  const { co_hosts, total } = await eventService.getAdminCoHosts({
    page,
    pageSize,
    search,
    status,
    co_host_role,
    sortColumn,
    sortDirection,
  });

  return createSuccessResponse({
    co_hosts,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});
