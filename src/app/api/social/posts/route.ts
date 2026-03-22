/**
 * Social Media Posts Route
 * GET /api/social/posts — Retrieve paginated, filtered post history for a listing
 *
 * @authority TIER_5A_SOCIAL_MEDIA_MANAGER_MASTER_INDEX.md
 * @tier ADVANCED
 * @phase Tier 5A Social Media Manager - Phase 8
 * @reference src/app/api/social/connections/route.ts — Canon social API route pattern
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getSocialMediaService } from '@core/services/ServiceRegistry';
import { getDatabaseService } from '@core/services/DatabaseService';
import type { SocialPostFilters, SocialPostStatus, SocialPlatform } from '@core/types/social-media';

const VALID_STATUSES: SocialPostStatus[] = ['pending', 'posted', 'failed', 'scheduled', 'deleted'];
const VALID_PLATFORMS: SocialPlatform[] = ['facebook', 'twitter', 'instagram', 'linkedin', 'tiktok', 'pinterest', 'youtube'];

export const GET = apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');

  const url = new URL(context.request.url);
  const listingIdStr = url.searchParams.get('listing_id');

  if (!listingIdStr) {
    throw BizError.badRequest('listing_id is required');
  }

  const listingId = parseInt(listingIdStr, 10);
  if (isNaN(listingId)) {
    throw BizError.badRequest('listing_id must be a valid number');
  }

  // Security: Verify user owns the listing
  const db = getDatabaseService();
  const ownerCheck = await db.query<{ id: number }>(
    'SELECT id FROM listing_users WHERE listing_id = ? AND user_id = ? AND role IN (?, ?)',
    [listingId, user.id, 'owner', 'manager']
  );
  if (ownerCheck.rows.length === 0) {
    throw BizError.forbidden('You do not have permission to view posts for this listing');
  }

  // Parse pagination
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10) || 20));

  // Parse filters
  const filters: SocialPostFilters = {};

  const statusParam = url.searchParams.get('status');
  if (statusParam && VALID_STATUSES.includes(statusParam as SocialPostStatus)) {
    filters.status = statusParam as SocialPostStatus;
  }

  const platformParam = url.searchParams.get('platform');
  if (platformParam && VALID_PLATFORMS.includes(platformParam as SocialPlatform)) {
    filters.platform = platformParam as SocialPlatform;
  }

  const dateFromParam = url.searchParams.get('date_from');
  if (dateFromParam) {
    const parsed = new Date(dateFromParam);
    if (!isNaN(parsed.getTime())) {
      filters.dateFrom = parsed;
    }
  }

  const dateToParam = url.searchParams.get('date_to');
  if (dateToParam) {
    const parsed = new Date(dateToParam);
    if (!isNaN(parsed.getTime())) {
      filters.dateTo = parsed;
    }
  }

  const socialService = getSocialMediaService();
  const result = await socialService.getPosts(listingId, filters, page, limit);

  return createSuccessResponse({
    posts: result.data,
    pagination: result.pagination,
  }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET'],
});
