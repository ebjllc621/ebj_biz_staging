/**
 * Event Follows API Route - POST create, GET list
 *
 * @tier STANDARD
 * @phase Events Phase 2 - Notification System
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/integrationPointRef/events/phases/PHASE_2_PLAN.md
 */

import { getEventService, getDatabaseService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import type { EventFollowType, EventNotificationFrequency } from '@features/events/types';

// ============================================================================
// POST - Follow a business or category for event notifications
// ============================================================================

export const POST = apiHandler(async (context) => {
  const { request } = context;

  // Auth required
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      401
    );
  }

  // Parse request body
  let body: { follow_type: EventFollowType; target_id?: number; frequency?: EventNotificationFrequency };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse(
      BizError.badRequest('Invalid JSON body'),
      400
    );
  }

  const { follow_type, target_id, frequency = 'realtime' } = body;

  // Validate follow_type
  const validFollowTypes: EventFollowType[] = ['business', 'category', 'all_events'];
  if (!follow_type || !validFollowTypes.includes(follow_type)) {
    return createErrorResponse(
      BizError.badRequest('Invalid follow type'),
      400
    );
  }

  // Validate frequency
  const validFrequencies: EventNotificationFrequency[] = ['realtime', 'daily', 'weekly'];
  if (!validFrequencies.includes(frequency)) {
    return createErrorResponse(
      BizError.badRequest('Invalid notification frequency'),
      400
    );
  }

  // Validate target_id based on follow_type
  if (follow_type === 'all_events' && target_id !== undefined) {
    return createErrorResponse(
      BizError.badRequest('all_events follow type cannot have target_id'),
      400
    );
  }

  if ((follow_type === 'business' || follow_type === 'category') && !target_id) {
    return createErrorResponse(
      BizError.badRequest(`${follow_type} follow type requires target_id`),
      400
    );
  }

  // Get EventService and create follow
  const eventService = getEventService();
  const follow = await eventService.followBusiness(
    user.id,
    follow_type,
    target_id ?? null,
    frequency
  );

  return createSuccessResponse({ follow }, 201);
});

// ============================================================================
// GET - Get user's event follows (with target_name JOIN)
// ============================================================================

export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Auth required
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      401
    );
  }

  // Use DatabaseService directly for the JOIN query (EventService has no follow+target_name method)
  const db = getDatabaseService();

  const result = await db.query<{
    id: number;
    follow_type: EventFollowType;
    target_id: number | null;
    notification_frequency: EventNotificationFrequency;
    created_at: string;
    target_name: string | null;
  }>(
    `SELECT ef.id, ef.follow_type, ef.target_id, ef.notification_frequency, ef.created_at,
       CASE
         WHEN ef.follow_type = 'business' THEN l.name
         WHEN ef.follow_type = 'category' THEN et.name
         ELSE 'All Events'
       END AS target_name
     FROM event_follows ef
     LEFT JOIN listings l ON ef.follow_type = 'business' AND ef.target_id = l.id
     LEFT JOIN event_types et ON ef.follow_type = 'category' AND ef.target_id = et.id
     WHERE ef.user_id = ?
     ORDER BY ef.created_at DESC`,
    [user.id]
  );

  return createSuccessResponse({ follows: result.rows }, 200);
});
