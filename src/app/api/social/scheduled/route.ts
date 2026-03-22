/**
 * Scheduled Posts List Route
 * GET /api/social/scheduled?listing_id=123
 *
 * @authority TIER_5A_SOCIAL_MEDIA_MANAGER_MASTER_INDEX.md
 * @tier ADVANCED
 * @phase Tier 5A Social Media Manager - Phase 7
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getSocialMediaService } from '@core/services/ServiceRegistry';
import { getDatabaseService } from '@core/services/DatabaseService';

export const GET = apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');

  const url = new URL(context.request.url);
  const listingIdParam = url.searchParams.get('listing_id');
  if (!listingIdParam) {
    throw BizError.badRequest('listing_id query parameter is required');
  }

  const listingId = parseInt(listingIdParam, 10);
  if (isNaN(listingId)) {
    throw BizError.badRequest('listing_id must be a valid number');
  }

  // Ownership verification
  const db = getDatabaseService();
  const ownerCheck = await db.query<{ id: number }>(
    'SELECT id FROM listing_users WHERE listing_id = ? AND user_id = ? AND role IN (?, ?)',
    [listingId, user.id, 'owner', 'manager']
  );
  if (ownerCheck.rows.length === 0) {
    throw BizError.forbidden('You do not have permission to view scheduled posts for this listing');
  }

  const socialService = getSocialMediaService();
  const scheduledPosts = await socialService.getScheduledPosts(listingId);

  return createSuccessResponse({ scheduled_posts: scheduledPosts }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET'],
});
