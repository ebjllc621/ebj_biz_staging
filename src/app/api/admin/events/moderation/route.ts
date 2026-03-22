/**
 * Admin Event Moderation API Route
 *
 * GET /api/admin/events/moderation - Get community events pending moderation
 * PUT /api/admin/events/moderation - Approve or reject community event
 *
 * @tier STANDARD
 * @phase Events Phase 3A - Community Events
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/integrationPointRef/events/phases/PHASE_3A_PLAN.md
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getEventService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { withCsrf } from '@/lib/security/withCsrf';

/**
 * GET /api/admin/events/moderation
 * Get community events pending moderation (admin only)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  if (user.account_type !== 'admin') {
    throw BizError.forbidden('Admin access required');
  }

  const eventService = getEventService();
  const events = await eventService.getCommunityEventsPendingModeration();

  return createSuccessResponse({
    events,
    total: events.length
  }, context.requestId);
});

/**
 * PUT /api/admin/events/moderation
 * Approve or reject community event (admin only)
 */
export const PUT = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  if (user.account_type !== 'admin') {
    throw BizError.forbidden('Admin access required');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw BizError.badRequest('Invalid JSON in request body');
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw BizError.badRequest('Request body must be an object');
  }

  const requestBody = body as Record<string, unknown>;

  if (!requestBody.event_id || typeof requestBody.event_id !== 'number') {
    throw BizError.validation('event_id', requestBody.event_id, 'Event ID is required');
  }

  if (!requestBody.action || typeof requestBody.action !== 'string') {
    throw BizError.validation('action', requestBody.action, 'Action is required');
  }

  if (!['approve', 'reject'].includes(requestBody.action as string)) {
    throw BizError.validation('action', requestBody.action, 'Action must be "approve" or "reject"');
  }

  const eventService = getEventService();

  const event = await eventService.getById(requestBody.event_id as number);
  if (!event) {
    throw BizError.notFound('Event not found');
  }

  if (event.status !== 'pending_moderation') {
    throw BizError.badRequest('Event is not pending moderation');
  }

  const adminActivityService = getAdminActivityService();

  if (requestBody.action === 'approve') {
    await eventService.approveCommunityEvent(requestBody.event_id as number);

    await adminActivityService.logActivity({
      adminUserId: user.id,
      targetEntityType: 'event',
      targetEntityId: requestBody.event_id as number,
      actionType: 'event_moderated',
      actionCategory: 'moderation',
      actionDescription: `Approved community event ID ${requestBody.event_id} ("${event.title}")`,
      afterData: { action: 'approve', event_id: requestBody.event_id },
      severity: 'normal'
    });

    return createSuccessResponse({
      message: 'Community event approved successfully',
      event_id: requestBody.event_id
    }, context.requestId);
  } else {
    if (!requestBody.notes || typeof requestBody.notes !== 'string' || !requestBody.notes.trim()) {
      throw BizError.validation('notes', requestBody.notes, 'Rejection reason is required');
    }

    await eventService.rejectCommunityEvent(requestBody.event_id as number, requestBody.notes as string);

    await adminActivityService.logActivity({
      adminUserId: user.id,
      targetEntityType: 'event',
      targetEntityId: requestBody.event_id as number,
      actionType: 'event_moderated',
      actionCategory: 'moderation',
      actionDescription: `Rejected community event ID ${requestBody.event_id} ("${event.title}"): ${requestBody.notes}`,
      afterData: { action: 'reject', event_id: requestBody.event_id, notes: requestBody.notes },
      severity: 'normal'
    });

    return createSuccessResponse({
      message: 'Community event rejected successfully',
      event_id: requestBody.event_id
    }, context.requestId);
  }
}));
