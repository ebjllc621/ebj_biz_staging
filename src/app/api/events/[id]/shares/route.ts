/**
 * Event Share Recording API Route
 *
 * POST /api/events/[id]/shares - Record a share event
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse/createErrorResponse
 * - Authentication: Optional (captures user_id if authenticated)
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 3 - Event Analytics & Social Sharing
 */

import { getEventService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import type { EventShareType, EventSharePlatform } from '@features/events/types';

interface ShareRequestBody {
  share_type: EventShareType;
  platform: EventSharePlatform;
  share_url: string;
}

/**
 * POST /api/events/[id]/shares
 * Record a share event for analytics tracking
 */
export const POST = apiHandler(async (context) => {
  const { request } = context;

  // Extract event ID from URL path
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2]; // .../events/[id]/shares

  if (!id) {
    return createErrorResponse('Event ID is required', 400);
  }

  const eventId = parseInt(id);
  if (isNaN(eventId)) {
    return createErrorResponse('Invalid event ID', 400);
  }

  let body: ShareRequestBody;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse('Invalid request body', 400);
  }

  if (!body.platform || !body.share_type || !body.share_url) {
    return createErrorResponse('platform, share_type, and share_url are required', 400);
  }

  const user = await getUserFromRequest(request);

  const eventService = getEventService();
  await eventService.recordShare({
    event_id: eventId,
    user_id: user?.id,
    share_type: body.share_type,
    platform: body.platform,
    share_url: body.share_url
  });

  return createSuccessResponse({ message: 'Share recorded' }, 201);
});
