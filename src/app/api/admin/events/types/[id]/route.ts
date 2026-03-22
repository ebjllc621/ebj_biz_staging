/**
 * Admin Event Type Detail API Route
 *
 * PATCH  /api/admin/events/types/[id] - Update an event type (admin only)
 * DELETE /api/admin/events/types/[id] - Delete an event type (admin only)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse/createErrorResponse
 * - Admin authentication required
 *
 * @authority CLAUDE.md - API Standards
 * @reference src/app/api/admin/events/sponsors/[id]/route.ts - Pattern replication
 */

import { getEventService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getAdminActivityService } from '@core/services/AdminActivityService';

/**
 * PATCH /api/admin/events/types/[id]
 * Admin only — update an event type
 */
export const PATCH = apiHandler(async (context) => {
  const { request } = context;

  const url = new URL(request.url);
  const parts = url.pathname.split('/');
  const id = parseInt(parts[parts.length - 1] ?? '');
  if (isNaN(id)) {
    return createErrorResponse('Invalid event type ID', 400);
  }

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }
  if (user.role !== 'admin') {
    return createErrorResponse('Admin privileges required', 403);
  }

  const body = await request.json();
  const { name, slug, description, is_active, sort_order } = body;

  const eventService = getEventService();

  const existing = await eventService.getEventTypeById(id);
  if (!existing) {
    return createErrorResponse('Event type not found', 404);
  }

  try {
    await eventService.updateEventType(id, { name, slug, description, is_active, sort_order });

    const adminActivityService = getAdminActivityService();
    await adminActivityService.logActivity({
      adminUserId: user.id,
      targetEntityType: 'event_type',
      targetEntityId: id,
      actionType: 'event_type_updated',
      actionCategory: 'update',
      actionDescription: `Updated event type ID ${id}`,
      afterData: { name, slug, description, is_active, sort_order },
      severity: 'normal'
    });

    return createSuccessResponse({ message: 'Event type updated successfully' });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('Duplicate')) {
      return createErrorResponse('An event type with that slug already exists', 409);
    }
    throw error;
  }
});

/**
 * DELETE /api/admin/events/types/[id]
 * Admin only — delete an event type
 */
export const DELETE = apiHandler(async (context) => {
  const { request } = context;

  const url = new URL(request.url);
  const parts = url.pathname.split('/');
  const id = parseInt(parts[parts.length - 1] ?? '');
  if (isNaN(id)) {
    return createErrorResponse('Invalid event type ID', 400);
  }

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }
  if (user.role !== 'admin') {
    return createErrorResponse('Admin privileges required', 403);
  }

  const eventService = getEventService();

  const existing = await eventService.getEventTypeById(id);
  if (!existing) {
    return createErrorResponse('Event type not found', 404);
  }

  await eventService.deleteEventType(id);

  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: user.id,
    targetEntityType: 'event_type',
    targetEntityId: id,
    actionType: 'event_type_deleted',
    actionCategory: 'deletion',
    actionDescription: `Deleted event type ID ${id} ("${existing.name}")`,
    afterData: { deleted_id: id, name: existing.name },
    severity: 'normal'
  });

  return createSuccessResponse({ message: 'Event type deleted successfully' });
});
