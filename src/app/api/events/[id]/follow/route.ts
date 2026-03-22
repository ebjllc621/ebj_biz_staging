/**
 * Event Follow API Route
 *
 * POST /api/events/[id]/follow - Follow a business/category for event notifications
 * DELETE /api/events/[id]/follow - Unfollow (by followId query param)
 * GET /api/events/[id]/follow - Get follow status
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse/createErrorResponse
 * - Authentication: REQUIRED for all methods
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 3 - Event Analytics & Social Sharing
 */

import { getEventService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import type { EventFollowType, EventNotificationFrequency } from '@features/events/types';

interface FollowRequestBody {
  follow_type: EventFollowType;
  target_id: number | null;
  frequency?: EventNotificationFrequency;
}

/**
 * POST /api/events/[id]/follow
 * Follow a business/category for event notifications
 */
export const POST = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  let body: FollowRequestBody;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse('Invalid request body', 400);
  }

  if (!body.follow_type) {
    return createErrorResponse('follow_type is required', 400);
  }

  const eventService = getEventService();
  const result = await eventService.followBusiness(
    user.id,
    body.follow_type,
    body.target_id ?? null,
    body.frequency || 'realtime'
  );

  return createSuccessResponse({ followId: result.id, message: 'Follow recorded' }, 201);
});

/**
 * DELETE /api/events/[id]/follow
 * Unfollow — requires followId query param
 */
export const DELETE = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  const url = new URL(request.url);
  const followIdParam = url.searchParams.get('followId');

  if (!followIdParam) {
    return createErrorResponse('followId query parameter is required', 400);
  }

  const followId = parseInt(followIdParam);
  if (isNaN(followId)) {
    return createErrorResponse('Invalid followId', 400);
  }

  const eventService = getEventService();
  await eventService.unfollowBusiness(followId);

  return createSuccessResponse({ message: 'Unfollowed successfully' });
});

/**
 * GET /api/events/[id]/follow
 * Get follow status for authenticated user
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  const url = new URL(request.url);
  const followType = url.searchParams.get('follow_type') as EventFollowType | null;
  const targetIdParam = url.searchParams.get('target_id');

  if (!followType) {
    return createErrorResponse('follow_type query parameter is required', 400);
  }

  const targetId = targetIdParam ? parseInt(targetIdParam) : null;

  const eventService = getEventService();
  const status = await eventService.getFollowStatus(user.id, followType, targetId);

  return createSuccessResponse(status);
});
