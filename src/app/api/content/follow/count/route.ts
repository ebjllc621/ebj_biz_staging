/**
 * Content Follow Count API Route
 *
 * GET /api/content/follow/count - Get follower count (public, no auth)
 *
 * @authority CLAUDE.md - API Standards
 * @phase Tier 4 - Content Subscription Phase 2
 */

import { getContentFollowService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import type { ContentFollowType } from '@core/types/content-follow';

/**
 * GET /api/content/follow/count
 * Get follower count for a follow_type + target_id combination
 * Public endpoint — no authentication required
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  const url = new URL(request.url);
  const followType = url.searchParams.get('follow_type') as ContentFollowType | null;

  if (!followType) {
    return createErrorResponse('follow_type query parameter is required', 400);
  }

  const targetIdParam = url.searchParams.get('target_id');
  const targetId = targetIdParam ? parseInt(targetIdParam) : null;

  const contentFollowService = getContentFollowService();
  const count = await contentFollowService.getFollowerCount(followType, targetId);

  return createSuccessResponse({ count });
});
