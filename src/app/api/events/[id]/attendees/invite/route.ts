/**
 * Attendee Invite API Route
 *
 * GET  /api/events/[id]/attendees/invite?q=... - Search users to invite
 * POST /api/events/[id]/attendees/invite       - Send invitations
 *
 * Auth: Event owner (listing owner) or co-host
 *
 * @phase Phase 8 - Polish + KPI Dashboard (FM 4.6)
 * @authority docs/pages/layouts/integrationPointRef/events/phases/PHASE_8_PLAN.md
 * @tier STANDARD
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getEventService, getListingService, getNotificationService } from '@core/services/ServiceRegistry';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import { ErrorService } from '@core/services/ErrorService';
import { bigIntToNumber } from '@core/utils/bigint';

/**
 * Verify user is event owner or co-host
 */
async function verifyEventAccess(
  eventId: number,
  userId: number
): Promise<{ authorized: boolean; event: { id: number; listing_id: number | null; title: string; slug: string | null } | null }> {
  const eventService = getEventService();
  const listingService = getListingService();

  const event = await eventService.getById(eventId);
  if (!event) return { authorized: false, event: null };

  // Check listing ownership
  if (event.listing_id) {
    const listing = await listingService.getById(event.listing_id);
    if (listing && listing.user_id === userId) {
      return { authorized: true, event };
    }
  }

  // Check co-host status
  const db = getDatabaseService();
  const coHostCheck = await db.query<{ id: number }>(
    `SELECT ch.id FROM event_co_hosts ch
     INNER JOIN listings l ON l.id = ch.co_host_listing_id
     WHERE ch.event_id = ? AND l.user_id = ? AND ch.status = 'active'
     LIMIT 1`,
    [eventId, userId]
  );

  if (coHostCheck.rows.length > 0) {
    return { authorized: true, event };
  }

  return { authorized: false, event };
}

/**
 * GET /api/events/[id]/attendees/invite?q=searchTerm
 * Search platform users for invitation (excludes already-RSVP'd)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(BizError.unauthorized('Authentication required'), context.requestId);
  }

  // Extract event ID from URL: /api/events/[id]/attendees/invite
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  // segments: ['api', 'events', '{id}', 'attendees', 'invite']
  const eventIdStr = segments[2];
  const eventId = parseInt(eventIdStr || '');
  if (isNaN(eventId)) {
    return createErrorResponse(BizError.badRequest('Invalid event ID'), context.requestId);
  }

  const { authorized } = await verifyEventAccess(eventId, user.id);
  if (!authorized) {
    return createErrorResponse(BizError.forbidden('invite attendees to events you do not own'), context.requestId);
  }

  const q = url.searchParams.get('q') || '';

  if (q.length < 2) {
    return createSuccessResponse({ users: [] }, context.requestId);
  }

  const db = getDatabaseService();
  const searchResults = await db.query<{
    id: number;
    username: string;
    email: string;
    display_name: string | null;
  }>(
    `SELECT u.id, u.username, u.email, u.display_name
     FROM users u
     WHERE (u.display_name LIKE ? OR u.email LIKE ? OR u.username LIKE ?)
       AND u.id != ?
       AND u.id NOT IN (
         SELECT r.user_id FROM event_rsvps r WHERE r.event_id = ?
       )
     ORDER BY u.display_name ASC
     LIMIT 10`,
    [`%${q}%`, `%${q}%`, `%${q}%`, user.id, eventId]
  );

  return createSuccessResponse({ users: searchResults.rows }, context.requestId);
});

/**
 * POST /api/events/[id]/attendees/invite
 * Send invitations to platform users
 */
export const POST = apiHandler(async (context: ApiContext) => {
  const { request } = context;
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(BizError.unauthorized('Authentication required'), context.requestId);
  }

  // Extract event ID from URL: /api/events/[id]/attendees/invite
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const eventIdStr = segments[2];
  const eventId = parseInt(eventIdStr || '');
  if (isNaN(eventId)) {
    return createErrorResponse(BizError.badRequest('Invalid event ID'), context.requestId);
  }

  const { authorized, event } = await verifyEventAccess(eventId, user.id);
  if (!authorized || !event) {
    return createErrorResponse(BizError.forbidden('invite attendees to events you do not own'), context.requestId);
  }

  const body = await request.json();
  const userIds: number[] = body.user_ids;
  const personalMessage: string | undefined = body.message;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return createErrorResponse(BizError.badRequest('user_ids must be a non-empty array'), context.requestId);
  }

  if (userIds.length > 50) {
    return createErrorResponse(BizError.badRequest('Cannot invite more than 50 users at once'), context.requestId);
  }

  const db = getDatabaseService();
  const notificationService = getNotificationService();

  let invited = 0;
  let skipped = 0;
  let errors = 0;

  for (const targetUserId of userIds) {
    try {
      // Check if already RSVP'd
      const existingRsvp = await db.query<{ id: number }>(
        `SELECT id FROM event_rsvps WHERE event_id = ? AND user_id = ?`,
        [eventId, targetUserId]
      );
      if (existingRsvp.rows.length > 0) {
        skipped++;
        continue;
      }

      // Check if already invited in last 7 days
      const existingInvite = await db.query<{ id: number }>(
        `SELECT id FROM user_notifications
         WHERE user_id = ? AND entity_type = 'event' AND entity_id = ?
           AND title LIKE 'Invitation:%'
           AND created_at > NOW() - INTERVAL 7 DAY
         LIMIT 1`,
        [targetUserId, eventId]
      );
      if (existingInvite.rows.length > 0) {
        skipped++;
        continue;
      }

      // Dispatch invitation notification
      const message = personalMessage
        ? `You've been invited to "${event.title}": ${personalMessage}`
        : `You've been invited to attend "${event.title}"!`;

      await notificationService.dispatch({
        type: 'event.invitation',
        recipientId: targetUserId,
        title: `Invitation: ${event.title}`,
        message,
        entityType: 'event',
        entityId: eventId,
        actionUrl: `/events/${event.slug || eventId}`,
        priority: 'normal',
        metadata: {
          event_id: eventId,
          invited_by: user.id,
        },
      });
      invited++;
    } catch (err) {
      errors++;
      ErrorService.capture(
        `[AttendeeInvite] Failed to invite user ${targetUserId} to event ${eventId}:`,
        err
      );
    }
  }

  return createSuccessResponse({ invited, skipped, errors }, context.requestId);
});
