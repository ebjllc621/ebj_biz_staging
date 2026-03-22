/**
 * Social Media Post Route
 * POST /api/social/post — Post content to a connected social platform
 *
 * @authority TIER_5A_SOCIAL_MEDIA_MANAGER_MASTER_INDEX.md
 * @tier ADVANCED
 * @phase Tier 5A Social Media Manager - Phase 3
 * @reference src/app/api/social/connect/route.ts — Canon social API route pattern
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { withCsrf } from '@/lib/security/withCsrf';
import { getSocialMediaService } from '@core/services/ServiceRegistry';
import { getDatabaseService } from '@core/services/DatabaseService';
import type { SocialPlatform } from '@core/types/social-media';

const VALID_PLATFORMS: SocialPlatform[] = ['facebook', 'twitter', 'instagram', 'linkedin', 'tiktok', 'pinterest'];

export const POST = withCsrf(apiHandler<{ post: unknown }>(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');

  const body = await context.request.json() as Record<string, unknown>;
  const { connection_id, content_type, content_id, post_text, post_image_url, post_link } = body;
  const scheduled_at = body.scheduled_at as string | undefined;

  // Validate required fields
  if (!connection_id || typeof connection_id !== 'number') {
    throw BizError.badRequest('connection_id is required and must be a number');
  }
  if (!content_type || typeof content_type !== 'string') {
    throw BizError.badRequest('content_type is required and must be a string');
  }
  if (!content_id || typeof content_id !== 'number') {
    throw BizError.badRequest('content_id is required and must be a number');
  }
  if (!post_text || typeof post_text !== 'string') {
    throw BizError.badRequest('post_text is required and must be a string');
  }

  const socialService = getSocialMediaService();

  // Get connection to derive listing_id and platform
  const connection = await socialService.getConnectionById(connection_id as number);
  if (!connection || !connection.is_active) {
    throw BizError.notFound('Social media connection not found or inactive');
  }

  // Security: Verify user owns the listing associated with this connection
  const db = getDatabaseService();
  const ownerCheck = await db.query<{ id: number }>(
    'SELECT id FROM listing_users WHERE listing_id = ? AND user_id = ? AND role IN (?, ?)',
    [connection.listing_id, user.id, 'owner', 'manager']
  );
  if (ownerCheck.rows.length === 0) {
    throw BizError.forbidden('You do not have permission to post for this listing');
  }

  // Validate platform is supported for posting
  if (!VALID_PLATFORMS.includes(connection.platform)) {
    throw BizError.badRequest(`Posting to ${connection.platform} is not yet supported`);
  }

  // If scheduled_at provided, schedule instead of posting immediately
  if (scheduled_at) {
    const scheduledDate = new Date(scheduled_at);
    if (isNaN(scheduledDate.getTime())) {
      throw BizError.badRequest('scheduled_at must be a valid ISO date string');
    }
    const minTime = new Date(Date.now() + 5 * 60 * 1000);
    if (scheduledDate < minTime) {
      throw BizError.badRequest('scheduled_at must be at least 5 minutes in the future');
    }

    const scheduledPost = await socialService.schedulePost({
      connection_id: connection_id as number,
      listing_id: connection.listing_id,
      content_type: content_type as string,
      content_id: content_id as number,
      platform: connection.platform,
      post_text: post_text as string,
      post_image_url: post_image_url as string | undefined,
      post_link: post_link as string | undefined,
      scheduled_at: scheduledDate,
    });

    return createSuccessResponse({ post: scheduledPost }, context.requestId);
  }

  // Post to social platform
  const result = await socialService.postToSocial({
    connection_id: connection_id as number,
    listing_id: connection.listing_id,
    content_type: content_type as string,
    content_id: content_id as number,
    platform: connection.platform,
    post_text: post_text as string,
    post_image_url: post_image_url as string | undefined,
    post_link: post_link as string | undefined,
  });

  return createSuccessResponse({ post: result }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
}));
