/**
 * Admin Ticket Sales API Route
 * GET /api/admin/events/ticket-sales - Platform-wide ticket sales data
 *
 * @authority CLAUDE.md - API Standards, Admin API
 * @phase Phase 5B - Native Ticketing (Admin Dashboard)
 * @tier ENTERPRISE (payment data, admin only)
 */

import { rbacApiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getEventService } from '@core/services/ServiceRegistry';
import type { PurchaseStatus } from '@features/events/types';

const eventService = getEventService();

/**
 * GET /api/admin/events/ticket-sales
 * Get platform-wide ticket sales stats and paginated purchase list.
 *
 * @authenticated Admin only (rbacApiHandler enforces)
 */
export const GET = rbacApiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);

  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '25');
  const status = url.searchParams.get('status') as PurchaseStatus | undefined;
  const startDate = url.searchParams.get('startDate') || undefined;
  const endDate = url.searchParams.get('endDate') || undefined;

  const result = await eventService.getPlatformTicketSalesStats({
    page,
    limit,
    status: status || undefined,
    startDate,
    endDate,
  });

  return createSuccessResponse({
    stats: result.stats,
    items: result.items,
    total: result.total,
    page,
    limit,
  }, context.requestId);
}, 'read', 'events', {
  allowedMethods: ['GET'],
});
