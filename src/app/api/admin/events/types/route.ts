/**
 * Admin Event Types API Route
 *
 * GET  /api/admin/events/types - List all event types with filtering (admin only)
 * POST /api/admin/events/types - Create a new event type (admin only)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse/createErrorResponse
 * - Admin authentication required
 *
 * @authority CLAUDE.md - API Standards
 * @reference src/app/api/admin/events/sponsors/route.ts - Pattern replication
 */

import { getEventService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getAdminActivityService } from '@core/services/AdminActivityService';

/**
 * GET /api/admin/events/types
 * Admin only — list all event types with filtering and pagination
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
  const sortColumn = url.searchParams.get('sortColumn') || 'sort_order';
  const sortDirection = url.searchParams.get('sortDirection') || 'asc';

  const eventService = getEventService();
  const { eventTypes, total } = await eventService.getAdminEventTypes({
    page,
    pageSize,
    search,
    status,
    sortColumn,
    sortDirection,
  });

  return createSuccessResponse({
    eventTypes,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

/**
 * POST /api/admin/events/types
 * Admin only — create a new event type
 */
export const POST = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }
  if (user.role !== 'admin') {
    return createErrorResponse('Admin privileges required', 403);
  }

  const body = await request.json();
  const { name, slug, description, is_active, sort_order } = body;

  if (!name || !slug) {
    return createErrorResponse('Name and slug are required', 400);
  }

  const eventService = getEventService();

  try {
    await eventService.createEventType({ name, slug, description, is_active, sort_order });

    const adminActivityService = getAdminActivityService();
    await adminActivityService.logActivity({
      adminUserId: user.id,
      targetEntityType: 'event_type',
      targetEntityId: 0,
      actionType: 'event_type_created',
      actionCategory: 'creation',
      actionDescription: `Created event type "${name}" (slug: ${slug})`,
      afterData: { name, slug, description, is_active, sort_order },
      severity: 'normal'
    });

    return createSuccessResponse({ message: 'Event type created successfully' }, 201);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('Duplicate')) {
      return createErrorResponse('An event type with that slug already exists', 409);
    }
    throw error;
  }
});
