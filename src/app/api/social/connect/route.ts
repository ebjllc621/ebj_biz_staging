/**
 * Social Media Connect Route
 * POST /api/social/connect — Initiates OAuth authorization flow for social posting
 *
 * @authority TIER_5A_SOCIAL_MEDIA_MANAGER_MASTER_INDEX.md
 * @tier ADVANCED
 * @phase Tier 5A Social Media Manager - Phase 2
 * @reference src/app/api/auth/platform/connect/route.ts — Canon connect route pattern
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { withCsrf } from '@/lib/security/withCsrf';
import { getSocialMediaService } from '@core/services/ServiceRegistry';
import type { SocialPlatform } from '@core/types/social-media';

const VALID_PLATFORMS: SocialPlatform[] = ['facebook', 'twitter', 'instagram', 'linkedin', 'tiktok', 'pinterest'];

export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');

  const body = await context.request.json() as Record<string, unknown>;
  const { platform, listing_id } = body;

  // Validate platform
  if (!platform || !VALID_PLATFORMS.includes(platform as SocialPlatform)) {
    throw BizError.badRequest(`platform must be one of: ${VALID_PLATFORMS.join(', ')}`);
  }

  // Validate listing_id
  if (!listing_id || typeof listing_id !== 'number') {
    throw BizError.badRequest('listing_id is required and must be a number');
  }

  const socialService = getSocialMediaService();
  const authorizationUrl = socialService.getAuthorizationUrl(
    platform as SocialPlatform,
    listing_id as number,
    user.id
  );

  return createSuccessResponse({ authorization_url: authorizationUrl }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
}));
