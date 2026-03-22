/**
 * Offer Follow Check API Route - GET check follow status
 *
 * @tier STANDARD
 * @phase Offers Phase 2 - Engagement & Notifications
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/offers/build/phases/PHASE_2_ENGAGEMENT_BRAIN_PLAN.md
 */

import { getOfferService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import type { FollowType } from '@features/offers/types';

// ============================================================================
// GET - Check if user follows a specific target
// ============================================================================

export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Auth required
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      401
    );
  }

  // Get query params
  const url = new URL(request.url);
  const followType = url.searchParams.get('type') as FollowType | null;
  const targetIdParam = url.searchParams.get('target');

  // Validate follow_type
  const validFollowTypes: FollowType[] = ['business', 'category', 'all_offers'];
  if (!followType || !validFollowTypes.includes(followType)) {
    return createErrorResponse(
      BizError.badRequest('Invalid or missing follow type'),
      400
    );
  }

  // Parse target_id
  let targetId: number | null = null;
  if (targetIdParam) {
    targetId = parseInt(targetIdParam, 10);
    if (isNaN(targetId)) {
      return createErrorResponse(
        BizError.badRequest('Invalid target ID'),
        400
      );
    }
  }

  // Validate target_id based on follow_type
  if (followType === 'all_offers' && targetId !== null) {
    return createErrorResponse(
      BizError.badRequest('all_offers follow type cannot have target_id'),
      400
    );
  }

  if ((followType === 'business' || followType === 'category') && targetId === null) {
    return createErrorResponse(
      BizError.badRequest(`${followType} follow type requires target_id`),
      400
    );
  }

  // Get OfferService
  const offerService = getOfferService();

  // Check follow status
  const follow = await offerService.getFollowStatus(user.id, followType, targetId);

  return createSuccessResponse({
    follows: follow !== null,
    follow: follow || undefined
  }, 200);
});
