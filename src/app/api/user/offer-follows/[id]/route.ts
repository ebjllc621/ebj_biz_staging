/**
 * Offer Follow Detail API Route - DELETE (unfollow)
 *
 * @tier STANDARD
 * @phase Offers Phase 2 - Engagement & Notifications
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/offers/build/phases/PHASE_2_ENGAGEMENT_BRAIN_PLAN.md
 */

import { getOfferService, getDatabaseService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';

// ============================================================================
// DELETE - Unfollow
// ============================================================================

export const DELETE = apiHandler(async (context) => {
  const { request } = context;

  // Auth required
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      401
    );
  }

  // Extract ID from URL pathname - /api/user/offer-follows/[id]
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const followIdStr = pathSegments[pathSegments.length - 1] || '';
  const followId = parseInt(followIdStr, 10);

  if (isNaN(followId)) {
    return createErrorResponse(
      BizError.badRequest('Invalid follow ID'),
      400
    );
  }

  // Get services
  const offerService = getOfferService();
  const db = getDatabaseService();

  // Get follow record to verify ownership
  const followResult = await db.query<{
    id: number;
    user_id: number;
    follow_type: 'business' | 'category' | 'all_offers';
    target_id: number | null;
  }>(
    'SELECT * FROM offer_follows WHERE id = ?',
    [followId]
  );

  if (followResult.rows.length === 0) {
    return createErrorResponse(
      BizError.notFound('Follow', followId),
      404
    );
  }

  const follow = followResult.rows[0];
  if (!follow) {
    return createErrorResponse(
      BizError.notFound('Follow', followId),
      404
    );
  }

  // Verify ownership
  if (follow.user_id !== user.id) {
    return createErrorResponse(
      BizError.forbidden('You are not authorized to delete this follow'),
      403
    );
  }

  // Delete follow
  await offerService.unfollowForOffers(user.id, follow.follow_type, follow.target_id);

  return createSuccessResponse({ success: true }, 200);
});
