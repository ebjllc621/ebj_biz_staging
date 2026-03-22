/**
 * Admin Event Batch Operations API Route
 * POST /api/admin/events/batch - Batch operations on events
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - withCsrf: MANDATORY for POST
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse
 * - Service boundary: EventService
 * - Admin activity logging: AdminActivityService.logModeration()
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 7 - Admin Enhancements & Cleanup
 */

import { NextRequest } from 'next/server';
import { getEventService } from '@core/services/ServiceRegistry';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

/**
 * POST /api/admin/events/batch
 * Batch operations on events (currently supports: delete)
 */
export const POST = withCsrf(apiHandler(async (context) => {
  const currentUser = await getUserFromRequest(context.request as NextRequest);
  if (!currentUser) throw BizError.unauthorized('Authentication required');
  if (currentUser.role !== 'admin') throw BizError.forbidden('Admin access required');

  const body = await context.request.json();
  const { action, eventIds } = body;

  if (!action || action !== 'delete') throw BizError.badRequest('Invalid action. Only "delete" is supported.');
  if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) throw BizError.badRequest('eventIds array is required');

  const eventService = getEventService();
  const result = await eventService.bulkDeleteEvents(eventIds);

  // Log admin activity for bulk delete
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logModeration({
    adminUserId: currentUser.id,
    targetEntityType: 'event',
    targetEntityId: eventIds[0],
    actionType: 'event_bulk_deleted',
    actionDescription: `Bulk deleted ${result.successCount} events (${result.failureCount} failures)`,
    beforeData: { eventIds },
    afterData: { successCount: result.successCount, failureCount: result.failureCount },
    severity: 'high'
  });

  return createSuccessResponse(result, 200);
}));
