/**
 * Admin Event Status Change API Route
 * PATCH /api/admin/events/[id]/status - Change event status
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - withCsrf: MANDATORY for PATCH
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse
 * - Service boundary: EventService
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 7 - Admin Enhancements & Cleanup
 */

import { NextRequest } from 'next/server';
import { getEventService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { withCsrf } from '@/lib/security/withCsrf';

/**
 * PATCH /api/admin/events/[id]/status
 * Change the status of an event
 */
export const PATCH = withCsrf(apiHandler(async (context) => {
  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) throw BizError.unauthorized('Authentication required');
  if (user.role !== 'admin') throw BizError.forbidden('Admin access required');

  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const idSegment = String(pathParts[pathParts.length - 2] ?? ''); // /api/admin/events/[id]/status
  const eventId = parseInt(idSegment);
  if (isNaN(eventId)) throw BizError.badRequest('Invalid event ID');

  const body = await context.request.json();
  const { status } = body;
  if (!status || typeof status !== 'string') throw BizError.badRequest('status is required');

  const eventService = getEventService();
  await eventService.updateEventStatus(eventId, status);

  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: user.id,
    targetEntityType: 'event',
    targetEntityId: eventId,
    actionType: 'event_status_updated',
    actionCategory: 'moderation',
    actionDescription: `Changed event ID ${eventId} status to "${status}"`,
    afterData: { status },
    severity: 'normal'
  });

  return createSuccessResponse({ message: 'Event status updated' }, 200);
}));
