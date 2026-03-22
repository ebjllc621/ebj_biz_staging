/**
 * Admin Event Feature Toggle API Route
 * PATCH /api/admin/events/[id]/feature - Toggle event featured status
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
 * PATCH /api/admin/events/[id]/feature
 * Toggle featured status for an event
 */
export const PATCH = withCsrf(apiHandler(async (context) => {
  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) throw BizError.unauthorized('Authentication required');
  if (user.role !== 'admin') throw BizError.forbidden('Admin access required');

  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const idSegment = String(pathParts[pathParts.length - 2] ?? ''); // /api/admin/events/[id]/feature
  const eventId = parseInt(idSegment);
  if (isNaN(eventId)) throw BizError.badRequest('Invalid event ID');

  const body = await context.request.json();
  const { featured } = body;
  if (typeof featured !== 'boolean') throw BizError.badRequest('featured must be a boolean');

  const eventService = getEventService();
  await eventService.featureEvent(eventId, featured);

  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: user.id,
    targetEntityType: 'event',
    targetEntityId: eventId,
    actionType: 'event_featured',
    actionCategory: 'update',
    actionDescription: `${featured ? 'Featured' : 'Unfeatured'} event ID ${eventId}`,
    afterData: { featured },
    severity: 'normal'
  });

  return createSuccessResponse({ message: 'Event featured status updated' }, 200);
}));
