/**
 * Social Media Connections Route
 * GET /api/social/connections — Retrieve active social connections for a listing
 *
 * @authority TIER_5A_SOCIAL_MEDIA_MANAGER_MASTER_INDEX.md
 * @tier ADVANCED
 * @phase Tier 5A Social Media Manager - Phase 4
 * @reference src/app/api/social/post/route.ts — Canon social API route pattern
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
    throw BizError.forbidden('You do not have permission to view connections for this listing');
  }

  const socialService = getSocialMediaService();
  const connections = await socialService.getConnections(listingId);

  return createSuccessResponse({ connections }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET'],
});
