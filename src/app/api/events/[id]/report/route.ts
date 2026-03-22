/**
 * Event Report API Route
 * POST /api/events/[id]/report — Submit a user report for an event
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - withCsrf: MANDATORY for state-changing operations
 * - requireAuth: true (must be authenticated to report)
 * - DatabaseService boundary: All DB operations via service layer
 * - Rate limiting: One report per user per event enforced via admin_activity
 *
 * @authority CLAUDE.md - API Standards section
 * @phase Phase 5 Gap-Fill - Detail Page Polish (G23)
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getEventService, getAdminActivityService } from '@core/services/ServiceRegistry';
import { getDatabaseService } from '@core/services/DatabaseService';
import { withCsrf } from '@/lib/security/withCsrf';

/**
 * Extract event ID from URL pathname (segment before 'report')
 */
function extractEventId(url: URL): number {
  const segments = url.pathname.split('/');
  const reportIndex = segments.indexOf('report');
  const id = reportIndex > 0 ? segments[reportIndex - 1] : null;

  if (!id) {
    throw BizError.badRequest('Event ID is required');
  }

  const eventId = parseInt(id);
  if (isNaN(eventId)) {
    throw BizError.badRequest('Invalid event ID', { id });
  }

  return eventId;
}

/**
 * POST /api/events/[id]/report
 * Submit a moderation report for an event.
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const eventId = extractEventId(url);

  // Require authentication
  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required to report events');
  }

  // Parse and validate request body
  const body = await context.request.json();
  const { reason, details } = body as { reason?: string; details?: string };

  const validReasons = ['spam', 'inappropriate', 'misleading', 'safety', 'other'];
  if (!reason || !validReasons.includes(reason)) {
    throw BizError.badRequest('A valid report reason is required');
  }

  // Verify event exists
  const eventService = getEventService();
  const event = await eventService.getById(eventId);
  if (!event) {
    throw BizError.notFound('Event not found');
  }

  // Rate limit: Check for existing report from this user for this event
  const db = getDatabaseService();
  const existingRows = await db.query<{ id: number }>(
    'SELECT id FROM admin_activity WHERE action_type = ? AND target_entity_id = ? AND JSON_EXTRACT(after_data, ?) = ?',
    ['event_report', eventId, '$.reporter_id', user.id]
  );

  if (existingRows.rows && existingRows.rows.length > 0) {
    throw BizError.badRequest('You have already reported this event');
  }

  // Log report via AdminActivityService
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: user.id,
    targetEntityType: 'event',
    actionType: 'event_report',
    actionCategory: 'moderation',
    actionDescription: `User reported event: ${event.title}`,
    targetEntityId: eventId,
    beforeData: null,
    afterData: {
      reason,
      details: details || null,
      reporter_id: user.id,
      reporter_email: user.email,
      event_title: event.title,
    },
  });

  return createSuccessResponse({ reported: true }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
}));
