/**
 * Content Follow API Route
 *
 * POST /api/content/follow - Follow content (auth required)
 * DELETE /api/content/follow - Unfollow (auth required)
 * GET /api/content/follow - Check status or list follows (auth required)
 * PATCH /api/content/follow - Update notification frequency (auth required)
 *
 * @authority CLAUDE.md - API Standards
 * @phase Tier 4 - Content Subscription Phase 2
 */

import { getContentFollowService, getInternalAnalyticsService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import type { ContentFollowType, ContentNotificationFrequency } from '@core/types/content-follow';

const VALID_FOLLOW_TYPES: ContentFollowType[] = [
  'business', 'category', 'content_type', 'all_content',
  'newsletter', 'podcast_show', 'marketer_profile', 'personality_profile'
];

const VALID_FREQUENCIES: ContentNotificationFrequency[] = ['realtime', 'daily', 'weekly'];

interface FollowRequestBody {
  followType: ContentFollowType;
  targetId: number | null;
  contentTypeFilter?: string | null;
  frequency?: ContentNotificationFrequency;
}

interface FrequencyUpdateBody {
  followId: number;
  frequency: ContentNotificationFrequency;
}

/**
 * POST /api/content/follow
 * Create a content follow
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

  if (!body.followType) {
    return createErrorResponse('followType is required', 400);
  }

  if (!VALID_FOLLOW_TYPES.includes(body.followType)) {
    return createErrorResponse(`Invalid followType. Must be one of: ${VALID_FOLLOW_TYPES.join(', ')}`, 400);
  }

  const contentFollowService = getContentFollowService();
  const follow = await contentFollowService.followContent(
    user.id,
    body.followType,
    body.targetId ?? null,
    body.frequency || 'daily',
    body.contentTypeFilter
  );

  // Fire-and-forget analytics tracking
  const analytics = getInternalAnalyticsService();
  analytics.trackEvent({
    eventName: 'content_follow',
    eventData: { followType: body.followType, targetId: body.targetId, contentTypeFilter: body.contentTypeFilter },
    userId: user.id
  });

  return createSuccessResponse({ follow, message: 'Follow recorded' }, 201);
});

/**
 * DELETE /api/content/follow
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

  const contentFollowService = getContentFollowService();
  await contentFollowService.unfollowContent(user.id, followId);

  // Fire-and-forget analytics tracking
  const analytics = getInternalAnalyticsService();
  analytics.trackEvent({
    eventName: 'content_unfollow',
    eventData: { followId },
    userId: user.id
  });

  return createSuccessResponse({ message: 'Unfollowed successfully' });
});

/**
 * GET /api/content/follow
 * Check follow status (follow_type + target_id) OR list user follows (list=true)
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  const url = new URL(request.url);
  const listParam = url.searchParams.get('list');

  const contentFollowService = getContentFollowService();

  // List mode: return all user follows
  if (listParam === 'true') {
    const follows = await contentFollowService.getUserFollows(user.id);
    return createSuccessResponse({ follows });
  }

  // Status check mode: requires follow_type
  const followType = url.searchParams.get('follow_type') as ContentFollowType | null;
  if (!followType) {
    return createErrorResponse('follow_type query parameter is required', 400);
  }

  const targetIdParam = url.searchParams.get('target_id');
  const targetId = targetIdParam ? parseInt(targetIdParam) : null;
  const contentTypeFilter = url.searchParams.get('content_type_filter');

  const status = await contentFollowService.getFollowStatus(user.id, followType, targetId, contentTypeFilter);

  return createSuccessResponse(status);
});

/**
 * PATCH /api/content/follow
 * Update notification frequency
 */
export const PATCH = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  let body: FrequencyUpdateBody;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse('Invalid request body', 400);
  }

  if (!body.followId) {
    return createErrorResponse('followId is required', 400);
  }

  if (!body.frequency || !VALID_FREQUENCIES.includes(body.frequency)) {
    return createErrorResponse(`frequency is required and must be one of: ${VALID_FREQUENCIES.join(', ')}`, 400);
  }

  const contentFollowService = getContentFollowService();
  await contentFollowService.updateFrequency(body.followId, user.id, body.frequency);

  return createSuccessResponse({ message: 'Frequency updated' });
});
